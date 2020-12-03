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
        value.includes('var(') && legacyVariables.set(key, replaceCSSVariables(value, legacyVariables)[0]);
        try {
            legacyVariables.set(key, rgbToString(parse(value)));
        } catch (err) {
            logWarn(err);
            return;
        }
    });

    variables.forEach((variable, key) => {
        variable.value.includes('var(') && variables.set(key, {
            value: replaceCSSVariables(variable.value, legacyVariables)[0],
            property: variable.property
        });
    });

    const variablesStyle: HTMLStyleElement = document.head.querySelector(`.darkreader--dynamicVariable`);
    const {sheet} = variablesStyle;
    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        sheet.deleteRule(i);
    }

    const declarations: VariableDeclaration[] = [];
    variables.forEach((variable, key) => {
        const selector = key.split(';')[0];
        const {property, value} = variable;
        if (cachedVariables.has(key)) {
            const {modifiedBackground, modifiedText, modifiedBorder} = cachedVariables.get(key);
            declarations.push({selector, key, property, modifiedBackground, modifiedText, modifiedBorder});
        } else if (value.includes('var(')) {
            const [modifiedBackground, modifiedText, modifiedBorder] = ['bg', 'text', 'border'].map((value) => `--darkreader-${value}${property}`);
            declarations.push({selector, key, property, modifiedBackground, modifiedText, modifiedBorder});
        } else {
            let parsedValue: RGBA;
            try {
                parsedValue = parse(value);
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
        cachedVariables.set(key, {modifiedBackground, modifiedText, modifiedBorder});
        const modifiedVariables = [['bg', modifiedBackground], ['text', modifiedText], ['border', modifiedBorder]].map((value) => `--darkreader-${value[0]}${property}: ${value[1]};`);
        sheet.insertRule(`${selector} { ${modifiedVariables.join(' ')} }`);
    });
}
