import {styleManagers} from './index';
import {forEach} from '../../utils/array';

function beautify(text: any[] | string) {
    if (Array.isArray(text)) {
        text = text.join('\n')
    }

    const CSS = (text
        .replace(/\{/g,'{%--%') // {
        .replace(/\}/g,'%--%}%--%') // }
        .replace(/\;/g,';%--%') // ;
        .replace(/%--%\s{0,}%--%/g,'%--%') // Remove %--% Without any characters between to next %--%
        .split('%--%'));
    let deep = 0;
    const formatted = [];
    const shift = '   ';

    for (let x = 0, len = CSS.length; x < len; x++) {
        const line = CSS[x] + '\n';
        if (line.match(/\{/)) { // {
            formatted.push(shift.repeat(deep++) + line);
        } else if (line.match(/\}/)) {
            formatted.push(shift.repeat(--deep) + line);
        } else {
            formatted.push(shift.repeat(deep) + line);
        }
    }
    return formatted.join('');
}

export function exportCSSText() {
    const css = [];

    const fallbackStyle = document.head.querySelector('.darkreader--fallback');
    const userAgentStyle = document.head.querySelector('.darkreader--user-agent');
    const textStyle = document.head.querySelector('.darkreader--text');
    const invertStyle = document.head.querySelector('.darkreader--invert');
    const overrideStyle = document.head.querySelector('.darkreader--override');
    const variableStyle = document.head.querySelector('.darkreader--variables');

    if (fallbackStyle && fallbackStyle.textContent) {
        css.push('/* Fallback Style */');
        css.push(beautify(fallbackStyle.textContent));
        css.push('');
    }

    if (userAgentStyle && userAgentStyle.textContent) {
        css.push('/* User-Agent Style */');
        css.push(beautify(userAgentStyle.textContent));
        css.push('');
    }

    if (textStyle && textStyle.textContent) {
        css.push('/* Text Style */');
        css.push(beautify(textStyle.textContent));
        css.push('');
    }

    if (invertStyle && invertStyle.textContent) {
        css.push('/* Invert Style */');
        css.push(beautify(invertStyle.textContent));
        css.push('');
    }

    if (overrideStyle && overrideStyle.textContent) {
        css.push('/* Override Style */');
        css.push(beautify(overrideStyle.textContent));
        css.push('');
    }

    if (variableStyle && variableStyle.textContent) {
        css.push('/* Variables Style */');
        css.push(beautify(variableStyle.textContent));
        css.push('');
    }
    const modifiedCSS = [];
    styleManagers.forEach((manager) => {
        forEach(manager.modifiedRuleList().cssRules, (rule) => {
            modifiedCSS.push(`${rule.cssText}`);
        });

    });

    if (modifiedCSS.length != 0) {
        css.push('/* Modified CSS */');
        css.push(beautify(modifiedCSS));
        css.push('');
    }

    chrome.runtime.sendMessage({type: 'export-css-response', data: css.join('\n')});

}
