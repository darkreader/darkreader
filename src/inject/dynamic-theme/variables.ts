import type {Theme} from '../../definitions';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from '../../generators/modify-colors';
import type {RGBA} from '../../utils/color';
import {parse, rgbToString} from '../../utils/color';
import {push} from '../../utils/array';
import {logWarn} from '../utils/log';
import {replaceCSSVariables, varRegex} from './css-rules';
import {getBgModifier, gradientRegex} from './modify-css';

export const legacyVariables = new Map<string, string>();
export const variables = new Map<string, Map<string, Variable>>();
export const cachedVariables = new Map<string, Map<string, CachedVariables>>();

interface CachedVariables {
    modifiedBackground?: string;
    modifiedText?: string;
    modifiedBorder?: string;
    modifiedBackgroundImage?: string;
}
interface VariableDeclaration extends CachedVariables {
    selectorText: string;
    parentGroups: string[];
    property: string;
    key: string;
    asyncKey?: number;
}

interface AsyncVariableDeclaration {
    target: (CSSStyleSheet | CSSGroupingRule);
}

interface ImageVariable {
    href: string;
    baseURIofOwner: string;

}
export interface Variable {
    value: string;
    selectorText: string;
    parentGroups: string[];
    imageInfo?: ImageVariable;
}

export function updateVariables(newVars: Map<string, Map<string, Variable>>, theme: Theme, ignoreImageSelectors: string[]) {
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

    const asyncDeclarations = new Map<number, AsyncVariableDeclaration>();
    let asyncDeclarationCounter = 0;

    let isAsyncFinished = false;
    const asyncListeners = new Set<() => void>();

    const declarations: VariableDeclaration[] = [];
    variables.forEach((properties, key) => {
        properties.forEach((variable, property) => {
            const {value, selectorText, parentGroups, imageInfo} = variable;
            const standardDeclaration = {selectorText, property, parentGroups, key};
            if (cachedVariables.has(key) && cachedVariables.get(key).has(property)) {
                const {modifiedBackground, modifiedText, modifiedBorder, modifiedBackgroundImage} = cachedVariables.get(key).get(property);
                declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder, modifiedBackgroundImage});
            } else if (value.includes('var(')) {
                let match: RegExpExecArray;
                while ((match = varRegex.exec(value)) != null) {
                    const [modifiedBackground, modifiedText, modifiedBorder] = ['bg', 'text', 'border', 'bgImage'].map((value) => `var(--darkreader-v-${value}${match[1]}, ${match[0]})`);
                    declarations.push({...standardDeclaration, modifiedBackground, modifiedText, modifiedBorder});
                }
            } else if (imageInfo || gradientRegex.test(value)) {
                const rule = {
                    selectorText,
                    parentSheet: imageInfo ? imageInfo : null
                };
                const modifier = getBgModifier(value, rule, ignoreImageSelectors, () => false);
                if (typeof modifier === 'function') {
                    const modified = modifier(theme);
                    if (modified instanceof Promise) {
                        const asyncKey = asyncDeclarationCounter++;
                        const asyncDeclaration: VariableDeclaration = {...standardDeclaration, asyncKey};
                        declarations.push(asyncDeclaration);
                        modified.then((asyncValue) => {
                            if (!asyncValue) {
                                return;
                            }
                            const options = {selectorText, modifiedBackgroundImage: asyncValue, property};
                            isAsyncFinished ? rebuildAsyncRule(asyncKey, options) :
                                asyncListeners.add(() => {
                                    rebuildAsyncRule(asyncKey, options);
                                });
                        });
                    } else {
                        declarations.push({...standardDeclaration, modifiedBackgroundImage: modified});
                    }
                } else {
                    declarations.push({...standardDeclaration, modifiedBackgroundImage: value});
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

    type SelectorGroup = {target: CSSStyleSheet | CSSGroupingRule; selector: string; variables: string[]; property: string; asyncKey: number[]};
    const selectorGroups: SelectorGroup[] = [];

    declarations.forEach(({selectorText, asyncKey, key, property, parentGroups, modifiedBackground, modifiedText, modifiedBorder, modifiedBackgroundImage}) => {
        cachedVariables.get(key).set(property, {modifiedBackground, modifiedText, modifiedBorder, modifiedBackgroundImage});
        const modifiedVariables = [['bg', modifiedBackground], ['text', modifiedText], ['border', modifiedBorder], ['bgImage', modifiedBackgroundImage]].filter(([key, value]) => value && key).map(([type, value]) => `--darkreader-v-${type}${property}: ${value};`);
        let target: CSSStyleSheet | CSSGroupingRule = sheet;
        for (let i = 0, len = parentGroups.length; i < len; i++) {
            target = createTarget(parentGroups[i], target);
        }
        let hasMatchedSelectorGroup = false;
        if (selectorGroups.length > 0) {
            const lastGroup = selectorGroups[selectorGroups.length - 1];
            if (lastGroup.target === target && lastGroup.selector === selectorText) {
                push(lastGroup.variables, modifiedVariables);
                push(lastGroup.asyncKey, [asyncKey]);
                hasMatchedSelectorGroup = true;
            }
        }
        if (!hasMatchedSelectorGroup) {
            selectorGroups.push({target, selector: selectorText, variables: modifiedVariables.slice(), asyncKey: [asyncKey], property});
        }
    });

    selectorGroups.forEach(({target, selector, variables, asyncKey}) => {
        const index = target.cssRules.length;
        asyncKey.filter((x) => x != null).forEach((asyncKey) => asyncDeclarations.set(asyncKey, {target}));
        target.insertRule(`${selector} { ${variables.join(' ')} }`, index);
    });

    function rebuildAsyncRule(key: number, {selectorText, modifiedBackgroundImage, property}) {
        const {target} = asyncDeclarations.get(key);
        const index = target.cssRules.length;
        target.insertRule(`${selectorText} { --darkreader-v-bgImage${property}: ${modifiedBackgroundImage}; }`, index);
        asyncDeclarations.delete(key);
    }
    isAsyncFinished = true;
    asyncListeners.forEach((listener) => listener());
}
