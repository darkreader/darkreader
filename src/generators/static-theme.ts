import {StaticTheme, Theme} from '../definitions';
import {isURLInList} from '../utils/url';
import {hslToRGB, RGBA} from '../utils/color';
import {getCSSFilterValue} from './css-filter';
import {modifyBackgroundColor, modifyForegroundColor, modifyBorderColor, modifyUntypedColor} from './modify-colors';

const sourceColors: {[type: string]: {[name: string]: RGBA}} = {
    'bg': {
        'neutral': hslToRGB({h: 0, s: 0, l: 1}),
        'neutral-2': hslToRGB({h: 0, s: 0, l: 0.8}),
        'neutral-3': hslToRGB({h: 0, s: 0, l: 0.6}),
        'red': hslToRGB({h: 355, s: 0.9, l: 0.8}),
        'red-2': hslToRGB({h: 0, s: 0.9, l: 0.6}),
        'orange': hslToRGB({h: 25, s: 0.9, l: 0.7}),
        'orange-2': hslToRGB({h: 30, s: 0.9, l: 0.5}),
        'yellow': hslToRGB({h: 55, s: 0.9, l: 0.8}),
        'yellow-2': hslToRGB({h: 60, s: 0.9, l: 0.6}),
        'green': hslToRGB({h: 140, s: 0.9, l: 0.7}),
        'green-2': hslToRGB({h: 135, s: 0.9, l: 0.5}),
        'cyan': hslToRGB({h: 180, s: 0.9, l: 0.8}),
        'cyan-2': hslToRGB({h: 175, s: 0.9, l: 0.6}),
        'blue': hslToRGB({h: 215, s: 0.9, l: 0.7}),
        'blue-2': hslToRGB({h: 210, s: 0.9, l: 0.5}),
        'violet': hslToRGB({h: 265, s: 0.9, l: 0.7}),
        'violet-2': hslToRGB({h: 260, s: 0.9, l: 0.5}),
        'magenta': hslToRGB({h: 330, s: 0.9, l: 0.8}),
        'magenta-2': hslToRGB({h: 325, s: 0.9, l: 0.6}),
    },
    'text': {
        'neutral': hslToRGB({h: 0, s: 0, l: 0}),
        'neutral-2': hslToRGB({h: 0, s: 0, l: 0.2}),
        'neutral-3': hslToRGB({h: 0, s: 0, l: 0.4}),
        'red': hslToRGB({h: 355, s: 0.9, l: 0.3}),
        'orange': hslToRGB({h: 25, s: 0.9, l: 0.3}),
        'yellow': hslToRGB({h: 55, s: 0.9, l: 0.4}),
        'green': hslToRGB({h: 110, s: 0.9, l: 0.4}),
        'cyan': hslToRGB({h: 180, s: 0.9, l: 0.4}),
        'blue': hslToRGB({h: 215, s: 0.9, l: 0.3}),
        'violet': hslToRGB({h: 265, s: 0.9, l: 0.3}),
        'magenta': hslToRGB({h: 330, s: 0.9, l: 0.4}),
    },
    'border': {
        'neutral': hslToRGB({h: 0, s: 0, l: 0.8}),
        'neutral-2': hslToRGB({h: 0, s: 0, l: 0.5}),
        'neutral-3': hslToRGB({h: 0, s: 0, l: 0.2}),
        'red': hslToRGB({h: 355, s: 0.9, l: 0.5}),
        'orange': hslToRGB({h: 25, s: 0.9, l: 0.5}),
        'yellow': hslToRGB({h: 55, s: 0.9, l: 0.5}),
        'green': hslToRGB({h: 110, s: 0.9, l: 0.5}),
        'cyan': hslToRGB({h: 180, s: 0.9, l: 0.5}),
        'blue': hslToRGB({h: 215, s: 0.9, l: 0.5}),
        'violet': hslToRGB({h: 265, s: 0.9, l: 0.5}),
        'magenta': hslToRGB({h: 330, s: 0.9, l: 0.5}),
    },
    '': {
        'light': hslToRGB({h: 0, s: 0, l: 1}),
        'light-2': hslToRGB({h: 0, s: 0, l: 0.8}),
        'light-3': hslToRGB({h: 0, s: 0, l: 0.6}),
        'dark': hslToRGB({h: 0, s: 0, l: 0}),
        'dark-2': hslToRGB({h: 0, s: 0, l: 0.2}),
        'dark-3': hslToRGB({h: 0, s: 0, l: 0.4}),
        'red': hslToRGB({h: 355, s: 0.9, l: 0.5}),
        'orange': hslToRGB({h: 25, s: 0.9, l: 0.5}),
        'yellow': hslToRGB({h: 55, s: 0.9, l: 0.5}),
        'green': hslToRGB({h: 110, s: 0.9, l: 0.5}),
        'cyan': hslToRGB({h: 180, s: 0.9, l: 0.5}),
        'blue': hslToRGB({h: 215, s: 0.9, l: 0.5}),
        'violet': hslToRGB({h: 265, s: 0.9, l: 0.5}),
        'magenta': hslToRGB({h: 330, s: 0.9, l: 0.5}),
    },
};

function getModifiedVariables(theme: Theme) {
    const variables: {[name: string]: string} = {};

    Object.entries(sourceColors).forEach(([type, colors]) => {
        Object.entries(colors).forEach(([name, rgb]) => {
            const varName = `--dr-${name}${type ? `-${type}` : ''}`;
            const value = {
                '': modifyUntypedColor,
                'bg': modifyBackgroundColor,
                'text': modifyForegroundColor,
                'border': modifyBorderColor,
            }[type](rgb, theme);
            variables[varName] = value;
        });
    });

    variables['--dr-filter'] = getCSSFilterValue(theme);

    return variables;
}

function getVariablesCSS(theme: Theme) {
    const variables = getModifiedVariables(theme);
    return [
        ':root {',
        ...Object.entries(variables).map(([key, value]) => `    ${key}: ${value};`),
        '}',
    ].join('\n');
}

export function addCSSVariablesToStyleSheet(theme: Theme, css: string) {
    return `${getVariablesCSS(theme)}\n${css}`;
}

export function createStaticStyleSheet(theme: Theme, url: string, themes: StaticTheme[]) {
    const {css} = (themes.slice(1).find((t) => isURLInList(url, t.url)) || themes[0]);
    return addCSSVariablesToStyleSheet(theme, css);
}
