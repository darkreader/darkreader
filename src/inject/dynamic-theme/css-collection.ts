import {forEach} from '../../utils/array';
import {loadAsDataURL} from '../../utils/network';
import {getMatches, formatCSS} from '../../utils/text';
import {overridesList} from './inline-style';

const blobRegex = /url\(\"(blob\:.*?)\"\)/g;

async function replaceBlobs(text: string) {
    const promises = [];
    getMatches(blobRegex, text, 1).forEach((url) => {
        const promise = loadAsDataURL(url);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return text.replace(blobRegex, () => `url("${data.shift()}")`);
}

function getUniqueSelector(element: Node) {
    let currentElement = element;
    let path: string;
    while (!(currentElement.nodeName.toLowerCase() === 'html')) {
        let name = currentElement.nodeName;
        if (!name) {
            break;
        }

        name = name.toLowerCase();

        const parent = currentElement.parentElement;
        let index = 0;
        let sameTagSiblings = 0;

        for (let x = 0, len = parent.children.length; x < len; x++) {
            const node = parent.children[x];
            if (node === currentElement) {
                index = x + 1;
                continue;
            }
            if (node.nodeName.toLowerCase() === name) {
                sameTagSiblings++;
            }
        }

        if (sameTagSiblings > 0) {
            path = `:nth-child(${index})` + (path ? ' > ' + path : '');
        } else {
            path = name + (path ? ' > ' + path : '');
        }

        currentElement = parent;
    }

    return path;
}

export async function collectCSS() {
    const css = [];

    function addStaticCSS(selector: string, comment: string) {
        const staticStyle = document.head.querySelector(selector);
        if (staticStyle && staticStyle.textContent) {
            css.push(`/* ${comment} */`);
            css.push(staticStyle.textContent);
            css.push('');
        }
    }

    addStaticCSS('.darkreader--fallback', 'Fallback Style');
    addStaticCSS('.darkreader--user-agent', 'User-Agent Style');
    addStaticCSS('.darkreader--text', 'Text Style');
    addStaticCSS('.darkreader--invert', 'Invert Style');
    addStaticCSS('.darkreader--override', 'Override Style');
    addStaticCSS('.darkreader--variables', 'Variables Style');

    // Prevent from having multiple selectors having the same property
    const inlineCSS = new Map<string, string>();
    overridesList.forEach((override) => {
        override.fullList.forEach((item) => {
            if (override.store.has(item)) {
                const property = `${override.cssProp}: ${override.store.get(item)}`;
                if (inlineCSS.has(property)) {
                    inlineCSS.set(property, `${inlineCSS.get(property)},\n${getUniqueSelector(item)}`);
                } else {
                    inlineCSS.set(property, getUniqueSelector(item));
                }
            }
        });
    });

    const propertys = inlineCSS.keys();
    const inline = [];
    forEach(propertys, (property) => {
        inline.push(`${inlineCSS.get(property)} { ${property} !important; }`);
    });

    if (inline.length != 0) {
        const formattedCSS = formatCSS(inline.join('\n'));
        css.push('/* Inline CSS */');
        css.push(formattedCSS);
        css.push('');
    }

    const modifiedCSS = [];
    document.querySelectorAll('.darkreader--sync').forEach((element: HTMLStyleElement) => {
        forEach(element.sheet.cssRules, (rule) => {
            rule && rule.cssText && modifiedCSS.push(rule.cssText);
        });
    });

    if (modifiedCSS.length != 0) {
        const formattedCSS = formatCSS(modifiedCSS.join('\n'));
        css.push('/* Modified CSS */');
        css.push(await replaceBlobs(formattedCSS));
        css.push('');
    }

    return css.join('\n');
}
