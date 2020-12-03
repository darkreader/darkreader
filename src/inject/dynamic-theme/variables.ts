import type {Theme} from '../../definitions';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from '../../generators/modify-colors';
import type {RGBA} from '../../utils/color';
import {parse, rgbToString} from '../../utils/color';
import {logWarn} from '../utils/log';
import {replaceCSSVariables} from './css-rules';

export const legacyVariables = new Map<string, string>();
export const variables = new Map<string, Variable>();
export const cachedVariables = new Map<string, CachedVariables>();

interface CachedVariables {
    modifiedBackground: string;
    modifiedText: string;
    modifiedBorder: string;
}

interface VariableDeclaration extends CachedVariables {
    selector: string;
    key: string;
    property: string;
}

export interface Variable {
    property: string;
    value: string;
}

export function updateVariables(newVars: Map<string, Variable>, theme: Theme) {
    if (newVars.size === 0) {
        return;
    }
    newVars.forEach((value, key) => {
        legacyVariables.set(value.property, value.value);
        cachedVariables.delete(key);
        variables.set(key, value);
    });

    legacyVariables.forEach((value, key) => {
        if (value.includes('--')) {
            legacyVariables.set(key, replaceCSSVariables(value, legacyVariables)[0]);
        }
        try {
            const parsed = parse(value);
            const RGB = rgbToString(parsed);
            legacyVariables.set(key, RGB);
        } catch (err) {
            return;
        }
    });

    variables.forEach((value, key) => {
        variables.set(key, {
            value: replaceCSSVariables(value.value, legacyVariables)[0],
            property: value.property
        });
    });

    const variablesStyle: HTMLStyleElement = document.head.querySelector(`.darkreader--dynamicVariable`);
    const {sheet} = variablesStyle;

    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        sheet.deleteRule(i);
    }

    const declarations: VariableDeclaration[] = [];

    variables.forEach((value, key) => {
        const selector = key.split(';')[0];
        const {property} = value;
        if (cachedVariables.has(key)) {
            const {modifiedBackground, modifiedText, modifiedBorder} = cachedVariables.get(key);
            declarations.push({selector, key, property, modifiedBackground, modifiedText, modifiedBorder});
        } else if (value.value.includes('var(')) {
            const modifiedBackground = `--darkreader-bg${value.property}`;
            const modifiedText = `--darkreader-text${value.property}`;
            const modifiedBorder = `--darkreader-border${value.property}`;
            declarations.push({selector, key, property, modifiedBackground, modifiedText, modifiedBorder});
        } else {
            let parsedValue: RGBA;
            try {
                parsedValue = parse(value.value);
            } catch (err) {
                logWarn(err);
                return;
            }
            const modifiedBackground = modifyBackgroundColor(parsedValue, theme);
            const modifiedText = modifyForegroundColor(parsedValue, theme);
            const modifiedBorder = modifyBorderColor(parsedValue, theme);
            declarations.push({selector, key, property, modifiedBackground, modifiedText, modifiedBorder});
        }
    });

    declarations.forEach(({selector, key, property, modifiedBackground, modifiedText, modifiedBorder}) => {
        cachedVariables.set(key, {
            modifiedBackground,
            modifiedText,
            modifiedBorder,
        });
        sheet.insertRule([
            `${selector} {`,
            `   --darkreader-bg${property}: ${modifiedBackground};`,
            `   --darkreader-text${property}: ${modifiedText};`,
            `   --darkreader-border${property}: ${modifiedBorder};`,
            `}`
        ].join('\n'));
    });


}
