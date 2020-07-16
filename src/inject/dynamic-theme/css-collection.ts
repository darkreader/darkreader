import {forEach} from '../../utils/array';
import {loadAsDataURL} from '../../utils/network';
import {getMatches} from '../../utils/text';

function getShift(deep: number, isEndBracket: boolean) {
    if (deep === 0) {
        return '';
    }
    if (deep === 1) {
        return isEndBracket ? ' '.repeat(4) : ' '.repeat(3);
    }
    if (deep > 1) {
        return isEndBracket ? ' '.repeat(4).repeat(deep) : ' '.repeat(4).repeat(deep).substr(1); // All property's have by default already 1x ' '
    }
}

async function formatCSS(text: string) {
    const CSS = (text
        .replace(/(.*?){ }/g, '') // Removing Empty CSS Rules
        .replace(/\s\s+/g, ' ') // Replacing multiple spaces to one
        .replace(/\{/g,'{%--%') // {
        .replace(/\}/g,'%--%}%--%') // }
        .replace(/\;(?![^\(]*\))/g,';%--%') // ; and do not target between () mostly for url()
        .replace(/%--%\s{0,}%--%/g,'%--%') // Remove %--% Without any characters between it to the next %--%
        .split('%--%'));
    let deep = 0;
    const formatted = [];

    for (let x = 0, len = CSS.length; x < len; x++) {
        const line = CSS[x] + '\n';
        if (line.match(/\{/)) { // {
            formatted.push(getShift(deep++, false) + line);
        } else if (line.match(/\}/)) { // }
            formatted.push(getShift(--deep, true) + line);
        } else { // CSS line
            formatted.push(getShift(deep, false) + line);
        }
    }

    // Replace all blob with data
    const promises = [];
    const endresult = formatted.join('');
    getMatches(/url\(\"(blob\:.*?)\"\)/g, endresult, 1).forEach((blob) => {
        const promise = loadAsDataURL(blob);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return endresult.replace(/url\(\"(blob\:.*?)\"\)/g, () => `url("${data.shift()}")`);

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
        css.push('/* Modified CSS */');
        css.push(await formatCSS(modifiedCSS.join('\n')));
        css.push('');
    }

    return css.join('\n');
}
