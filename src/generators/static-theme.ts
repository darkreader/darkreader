import {readText} from '../background/utils/network';
import {StaticTheme, Theme} from '../definitions';
import {isURLInList} from '../utils/url';

function getVariables(theme: Theme) {
    const bgColor = theme.mode === 1 ? theme.darkSchemeBackgroundColor : theme.lightSchemeBackgroundColor;
    const textColor = theme.mode === 1 ? theme.darkSchemeTextColor : theme.lightSchemeTextColor;
    return {
        '--dr-neutral-bg': bgColor,
        '--dr-neutral-text': textColor,
    };
}

const indent = '    ';

export default function createStaticStyleSheet(theme: Theme, url: string, themes: StaticTheme[]) {
    const {css} = (themes.slice(1).find((t) => isURLInList(url, t.url)) || themes[0]);
    const variables = getVariables(theme);
    return [
        ':root {',
        ...Object.entries(variables).map(([key, value]) => `${indent}${key}: ${value};`),
        '}',
        css,
    ].join('\n');
}
