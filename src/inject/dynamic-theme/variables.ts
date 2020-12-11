import type {Theme} from '../../definitions';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from '../../generators/modify-colors';
import type {RGBA} from '../../utils/color';
import {parse, rgbToString} from '../../utils/color';
import {push} from '../../utils/array';
import {logWarn} from '../utils/log';
import {replaceCSSVariables, varRegex} from './css-rules';

export const legacyVariables = new Map<string, string>();
export const variables = new Map<string, Map<string, Variable>>();
export const cachedVariables = new Map<string, Map<string, CachedVariables>>();

interface CachedVariables {
    modifiedBackground: string;
    modifiedText: string;
    modifiedBorder: string;
}
interface VariableDeclaration extends CachedVariables {
    selectorText: string;
    parentGroups: string[];
    property: string;
    key: string;
}

export interface Variable {
    value: string;
    selectorText: string;
    parentGroups: string[];
}

export function updateVariables(newVars: Map<string, Map<string, Variable>>, theme: Theme) {
    if (newVars.size === 0) {
        return;
    }
    newVars.forEach((properties, key) => {
        !variables.has(key) && variables.set(key, new Map());
        !cachedVariables.has(key) && cachedVariables.set(key, new Map());
        properties.forEach((variable, property) => {
            legacyVariables.set(property, variable.value);
            variables.get(key).set(property, variable);
            cachedVariables.has(key) && cachedVariables.get(key).delete(property);
        });
    });

    legacyVariables.forEach((value, key) => {
        value.includes('var(') && legacyVariables.set(key, replaceCSSVariables(value, legacyVariables).result);
        try {
            legacyVariables.set(key, rgbToString(parse(value)));
        } catch (err) {
            logWarn(err);
            return;
        }
    });

    const variablesStyle: HTMLStyleElement = document.head.querySelector(`.darkreader--dynamic-variables`);
    const {sheet} = variablesStyle;
    for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        sheet.deleteRule(i);
    }

    const declarations: VariableDeclaration[] = [];
    variables.forEach((properties, key) => {
        properties.forEach((variable, property) => {
            const {value, selectorText, parentGroups} = variable;
            const standardDeclaration = {selectorText, property, parentGroups, key};
            if (cachedVariables.has(key) && cachedVariables.get(key).has(property)) {
                const {modifiedBackground, modifiedText, modifiedBorder} = cachedVariables.get(key).get(property);
                declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder});
            } else if (value.includes('var(')) {
                let match: RegExpExecArray;
                while ((match = varRegex.exec(value)) != null) {
                    const [modifiedBackground, modifiedText, modifiedBorder] = ['bg', 'text', 'border'].map((value) => `var(--darkreader-v-${value}${match[1]}, ${match[0]})`);
                    declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder});
                }
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

    const targets = new WeakMap<CSSStyleSheet | CSSGroupingRule, Map<string, CSSGroupingRule>>();

    function createTarget(conditionText: string, parent: CSSStyleSheet | CSSGroupingRule): CSSGroupingRule {
        if (targets.has(parent)) {
            const targetMap = targets.get(parent);
            if (targetMap.has(conditionText)) {
                return targetMap.get(conditionText);
            }
        } else {
            targets.set(parent, new Map());
        }
        const index = parent.cssRules.length;
        parent.insertRule(`@media ${conditionText} {}`, index);
        const target = parent.cssRules[index] as CSSGroupingRule;
        targets.get(parent).set(conditionText, target);
        return target;
    }

    type SelectorGroup = {target: CSSStyleSheet | CSSGroupingRule; selector: string; variables: string[]};
    const selectorGroups: SelectorGroup[] = [];

    declarations.forEach(({selectorText, key, property, parentGroups, modifiedBackground, modifiedText, modifiedBorder}) => {
        cachedVariables.get(key).set(property, {modifiedBackground, modifiedText, modifiedBorder});
        const modifiedVariables = [['bg', modifiedBackground], ['text', modifiedText], ['border', modifiedBorder]].map(([type, value]) => `--darkreader-v-${type}${property}: ${value};`);
        let target: CSSStyleSheet | CSSGroupingRule = sheet;
        for (let i = 0, len = parentGroups.length; i < len; i++) {
            target = createTarget(parentGroups[i], target);
        }
        let hasMatchedSelectorGroup = false;
        if (selectorGroups.length > 0) {
            const lastGroup = selectorGroups[selectorGroups.length - 1];
            if (lastGroup.target === target && lastGroup.selector === selectorText) {
                push(lastGroup.variables, modifiedVariables);
                hasMatchedSelectorGroup = true;
            }
        }
        if (!hasMatchedSelectorGroup) {
            selectorGroups.push({target, selector: selectorText, variables: modifiedVariables.slice()});
        }
    });

    selectorGroups.forEach(({target, selector, variables}) => {
        target.insertRule(`${selector} { ${variables.join(' ')} }`, target.cssRules.length);
    });
}
