import {Theme} from './../../definitions.d';
import {createOrUpdateStyle} from '../style';

function createVariables(theme: Theme) {
    const lines = [];
    lines.push(':root {');
    lines.push('}')
    return lines.join('\n');
}

export function createOrUpdateStaticTheme(css: string, theme: Theme) {
    const variables = createVariables(theme);
    const styleCSS = variables + css;
    createOrUpdateStyle(styleCSS);
}