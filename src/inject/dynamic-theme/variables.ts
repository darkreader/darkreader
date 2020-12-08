import type {Theme} from '../../definitions';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from '../../generators/modify-colors';
import type {RGBA} from '../../utils/color';
import {parse, rgbToString} from '../../utils/color';
import {logWarn} from '../utils/log';
import {replaceCSSVariables} from './css-rules';

export const legacyVariables = new Map<string, string>();
export const variables = new Map<string, Map<string, Variable>>();
export const cachedVariables = new Map<string, Map<string, CachedVariables>>();

interface CachedVariables {
    modifiedBackground: string;
    modifiedText: string;
    modifiedBorder: string;
}

interface VariableDeclaration extends CachedVariables {
    selector: string;
    parentGroups: string[];
    property: string;
}

export interface Variable {
    value: string;
    parentGroups: string[];
}

export function updateVariables(newVars: Map<string, Map<string, Variable>>, theme: Theme) {
    if (newVars.size === 0) {
        return;
    }
    newVars.forEach((properties, selector) => {
        !variables.has(selector) && variables.set(selector, new Map());
        !cachedVariables.has(selector) && cachedVariables.set(selector, new Map());
        properties.forEach((variable, property) => {
            legacyVariables.set(property, variable.value);
            variables.get(selector).set(property, variable);
            cachedVariables.has(selector) && cachedVariables.get(selector).delete(property);
        });
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

    variables.forEach((properties, selector) => {
        properties.forEach((variable, property) => {
            variable.value.includes('var(') && variables.get(selector).set(property, {
                value: replaceCSSVariables(variable.value, legacyVariables)[0],
                parentGroups: variable.parentGroups
            });
        });
    });

    const variablesStyle: HTMLStyleElement = document.head.querySelector(`.darkreader--dynamic-variables`);
    const {sheet} = variablesStyle;
    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        sheet.deleteRule(i);
    }

    const declarations: VariableDeclaration[] = [];
    variables.forEach((properties, selector) => {
        properties.forEach((variable, property) => {
            const {value, parentGroups} = variable;
            const standardDeclaration = {selector, property, parentGroups};
            if (cachedVariables.has(selector) && cachedVariables.get(selector).has(property)) {
                const {modifiedBackground, modifiedText, modifiedBorder} = cachedVariables.get(selector).get(property);
                declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder});
            } else if (value.includes('var(')) {
                const [modifiedBackground, modifiedText, modifiedBorder] = ['bg', 'text', 'border'].map((value) => `var(--darkreader-v-${value}${property})`);
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
    });

    function createTarget(conditionText: string, parent: CSSStyleSheet | CSSGroupingRule): CSSGroupingRule {
        const index = parent.cssRules.length;
        parent.insertRule(`@media ${conditionText} {}`, index);
        return parent.cssRules[index] as CSSGroupingRule;
    }

    declarations.forEach(({selector, property, parentGroups, modifiedBackground, modifiedText, modifiedBorder}) => {
        cachedVariables.get(selector).set(property, {modifiedBackground, modifiedText, modifiedBorder});
        const modifiedVariables = [['bg', modifiedBackground], ['text', modifiedText], ['border', modifiedBorder]].map((value) => `--darkreader-${value[0]}${property}: ${value[1]};`);
        let target: CSSStyleSheet | CSSGroupingRule = sheet;
        while (parentGroups.length) {
            target = createTarget(parentGroups[0], target);
            parentGroups.shift();
        }
        target.insertRule(`${selector} { ${modifiedVariables.join(' ')} }`, target.cssRules.length);
    });
}
