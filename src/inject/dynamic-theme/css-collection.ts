import {StyleElement} from './style-manager';
import {forEach} from '../../utils/array';

function beautify(text: string) {
    const CSS = (text
        .replace(/\{/g,'{%--%') // {
        .replace(/\}/g,'%--%}%--%') // }
        .replace(/\;/g,';%--%') // ;
        .replace(/%--%\s{0,}%--%/g,'%--%') // Remove %--% Without any characters between to the next %--%
        .split('%--%'));
    let deep = 0;
    const formatted = [];
    const shift = '   ';

    for (let x = 0, len = CSS.length; x < len; x++) {
        const line = CSS[x] + '\n';
        if (line.match(/\{/)) { // {
            formatted.push(shift.repeat(deep++) + line);
        } else if (line.match(/\}/)) { // }
            formatted.push(shift.repeat(--deep) + line);
        } else { // CSS line
            formatted.push(shift.repeat(deep) + line);
        }
    }
    return formatted.join('');
}

export function exportCSSText() {
    const css = [];

    function addStaticCSS(selector: string, comment: string) {
        const staticStyle = document.head.querySelector(selector);
        if (staticStyle && staticStyle.textContent) {
            css.push(`/* ${comment} */`);
            css.push(beautify(staticStyle.textContent));
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
    document.querySelectorAll('.darkreader--sync').forEach((element) => {
        forEach((element as StyleElement).sheet.cssRules, (rule) => {
            rule && rule.cssText && modifiedCSS.push(rule.cssText);
        });
    });

    if (modifiedCSS.length != 0) {
        css.push('/* Modified CSS */');
        css.push(beautify(modifiedCSS.join('\n')));
        css.push('');
    }

    chrome.runtime.sendMessage({type: 'export-css-response', data: css.join('\n')});

}
