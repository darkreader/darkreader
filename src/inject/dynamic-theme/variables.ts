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
    parentGroups: string[];
    key: string;
    property: string;
}

export interface Variable {
    property: string;
    value: string;
    parentGroups: string[];
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
            property: variable.property,
            parentGroups: variable.parentGroups
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
        const {property, value, parentGroups} = variable;
        const standardDeclaration = {selector, key, property, parentGroups};
        if (cachedVariables.has(key)) {
            const {modifiedBackground, modifiedText, modifiedBorder} = cachedVariables.get(key);
            declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder});
        } else if (value.includes('var(')) {
            const [modifiedBackground, modifiedText, modifiedBorder] = ['bg', 'text', 'border'].map((value) => `--darkreader-${value}${property}`);
            declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder});
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
            declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder});
        }
    });

    function createTarget(conditionText: string, parent: CSSStyleSheet | CSSGroupingRule): CSSGroupingRule {
        const index = parent.cssRules.length;
        parent.insertRule(`@media ${conditionText} {}`, index);
        return parent.cssRules[index] as CSSGroupingRule;
    }

    declarations.forEach(({selector, key, property, parentGroups, modifiedBackground, modifiedText, modifiedBorder}) => {
        cachedVariables.set(key, {modifiedBackground, modifiedText, modifiedBorder});
        const modifiedVariables = [['bg', modifiedBackground], ['text', modifiedText], ['border', modifiedBorder]].map((value) => `--darkreader-${value[0]}${property}: ${value[1]};`);
        if (!parentGroups.length) {
            sheet.insertRule(`${selector} { ${modifiedVariables.join(' ')} }`);
        } else {
            let target: CSSStyleSheet | CSSGroupingRule = sheet;
            while (parentGroups.length) {
                target = createTarget(parentGroups[0], target);
                parentGroups.shift();
            }
            target.insertRule(`${selector} { ${modifiedVariables.join(' ')} }`, target.cssRules.length);
        }
    });
}
