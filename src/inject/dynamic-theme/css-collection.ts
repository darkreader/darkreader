import {forEach} from '../../utils/array';
import {loadAsDataURL} from '../../utils/network';
import {getMatches, formatCSS} from '../../utils/text';

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
