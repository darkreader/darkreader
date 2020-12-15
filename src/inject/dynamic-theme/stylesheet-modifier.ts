import type {Theme} from '../../definitions';
import {lazyRGBMatch, parseColorToRGBWithCache} from '../../utils/color';
import {getTempCSSStyleSheet} from '../utils/dom';
import {createAsyncTasksQueue} from '../utils/throttle';
import {iterateCSSRules, iterateCSSDeclarations, replaceCSSVariables} from './css-rules';
import type {ModifiableCSSDeclaration, ModifiableCSSRule} from './modify-css';
import {gradientRegex, getModifiableCSSDeclaration} from './modify-css';

const themeCacheKeys: Array<keyof Theme> = [
    'mode',
    'brightness',
    'contrast',
    'grayscale',
    'sepia',
    'darkSchemeBackgroundColor',
    'darkSchemeTextColor',
    'lightSchemeBackgroundColor',
    'lightSchemeTextColor',
];

function getThemeKey(theme: Theme) {
    return themeCacheKeys.map((p) => `${p}:${theme[p]}`).join(';');
}

const asyncQueue = createAsyncTasksQueue();

export function createStyleSheetModifier() {
    let renderId = 0;
    const rulesTextCache = new Map<string, string>();
    const rulesModCache = new Map<string, ModifiableCSSRule>();
    let prevFilterKey: string = null;

    interface ModifySheetOptions {
        sourceCSSRules: CSSRuleList;
        variables: Map<string, string>;
        theme: Theme;
        ignoreImageAnalysis: string[];
        force: boolean;
        prepareSheet: () => CSSStyleSheet;
        isAsyncCancelled: () => boolean;
    }

    function modifySheet(options: ModifySheetOptions): void {
        const rules = options.sourceCSSRules;
        const {theme, variables, ignoreImageAnalysis, force, prepareSheet, isAsyncCancelled} = options;

        let rulesChanged = (rulesModCache.size === 0);
        const notFoundCacheKeys = new Set(rulesModCache.keys());
        const themeKey = getThemeKey(theme);
        const themeChanged = (themeKey !== prevFilterKey);

        const modRules: ModifiableCSSRule[] = [];
        iterateCSSRules(rules, (rule) => {
            const cssText = rule.cssText;
            let textDiffersFromPrev = false;

            notFoundCacheKeys.delete(cssText);
            if (!rulesTextCache.has(cssText)) {
                rulesTextCache.set(cssText, cssText);
                textDiffersFromPrev = true;
            }

            // Put CSS text with inserted CSS variables into separate <style> element
            // to properly handle composite properties (e.g. background -> background-color)
            let vars: CSSStyleSheet;
            let varsRule: CSSStyleRule = null;
            const variablesMap: Map<string, string> = new Map<string, string>();
            if (variables.size > 0 || cssText.includes('var(')) {
                const {result, replacedMap} = replaceCSSVariables(cssText, variables);
                if (rulesTextCache.get(cssText) !== result) {
                    replacedMap.forEach((value, key) => {
                        key = parseColorToRGBWithCache(key);
                        key = key.replace(gradientRegex, (gradient) => {
                            variablesMap.set(gradient, value);
                            return '';
                        });
                        key = key.replace(lazyRGBMatch, (rgb) => {
                            variablesMap.set(rgb, value);
                            return '';
                        });
                        if (!key) {
                            return;
                        }
                        key.split(/\s/).forEach((property) => {
                            variablesMap.set(property, value);
                        });
                    });
                    rulesTextCache.set(cssText, result);
                    textDiffersFromPrev = true;
                    vars = getTempCSSStyleSheet();
                    vars.insertRule(result);
                    varsRule = vars.cssRules[0] as CSSStyleRule;
                }
            }

            if (textDiffersFromPrev) {
                rulesChanged = true;
            } else {
                modRules.push(rulesModCache.get(cssText));
                return;
            }

            const modDecs: ModifiableCSSDeclaration[] = [];
            const targetRule = varsRule || rule;
            targetRule && targetRule.style && iterateCSSDeclarations(targetRule.style, (property, value) => {
                if (variablesMap.has(value)) {
                    value = variablesMap.get(value);
                }
                const mod = getModifiableCSSDeclaration(property, value, rule, ignoreImageAnalysis, isAsyncCancelled);
                if (mod) {
                    modDecs.push(mod);
                }
            });

            let modRule: ModifiableCSSRule = null;
            if (modDecs.length > 0) {
                const parentRule = rule.parentRule;
                modRule = {selector: rule.selectorText, declarations: modDecs, parentRule};
                modRules.push(modRule);
            }
            rulesModCache.set(cssText, modRule);

            vars && vars.deleteRule(0);
        });

        notFoundCacheKeys.forEach((key) => {
            rulesTextCache.delete(key);
            rulesModCache.delete(key);
        });
        prevFilterKey = themeKey;

        if (!force && !rulesChanged && !themeChanged) {
            return;
        }

        renderId++;

        interface ReadyGroup {
            isGroup: true;
            rule: any;
            rules: Array<ReadyGroup | ReadyStyleRule>;
        }

        interface ReadyStyleRule {
            isGroup: false;
            selector: string;
            declarations: ReadyDeclaration[];
        }

        interface ReadyDeclaration {
            property: string;
            value: string;
            important: boolean;
            sourceValue: string;
            asyncKey?: number;
        }

        function setRule(target: CSSStyleSheet | CSSGroupingRule, index: number, rule: ReadyStyleRule) {
            const {selector, declarations} = rule;
            target.insertRule(`${selector} {}`, index);
            const style = (target.cssRules[index] as CSSStyleRule).style;
            declarations.forEach(({property, value, important, sourceValue}) => {
                style.setProperty(property, value == null ? sourceValue : value, important ? 'important' : '');
            });
        }

        interface AsyncRule {
            rule: ReadyStyleRule;
            target: (CSSStyleSheet | CSSGroupingRule);
            index: number;
        }

        const asyncDeclarations = new Map<number, AsyncRule>();
        let asyncDeclarationCounter = 0;

        const rootReadyGroup: ReadyGroup = {rule: null, rules: [], isGroup: true};
        const groupRefs = new WeakMap<CSSRule, ReadyGroup>();

        function getGroup(rule: CSSRule): ReadyGroup {
            if (rule == null) {
                return rootReadyGroup;
            }

            if (groupRefs.has(rule)) {
                return groupRefs.get(rule);
            }

            const group: ReadyGroup = {rule, rules: [], isGroup: true};
            groupRefs.set(rule, group);

            const parentGroup = getGroup(rule.parentRule);
            parentGroup.rules.push(group);

            return group;
        }

        modRules.filter((r) => r).forEach(({selector, declarations, parentRule}) => {
            const group = getGroup(parentRule);
            const readyStyleRule: ReadyStyleRule = {selector, declarations: [], isGroup: false};
            const readyDeclarations = readyStyleRule.declarations;
            group.rules.push(readyStyleRule);

            declarations.forEach(({property, value, important, sourceValue}) => {
                if (typeof value === 'function') {
                    const modified = value(theme);
                    if (modified instanceof Promise) {
                        const asyncKey = asyncDeclarationCounter++;
                        const asyncDeclaration: ReadyDeclaration = {property, value: null, important, asyncKey, sourceValue};
                        readyDeclarations.push(asyncDeclaration);
                        const currentRenderId = renderId;
                        modified.then((asyncValue) => {
                            if (!asyncValue || isAsyncCancelled() || currentRenderId !== renderId) {
                                return;
                            }
                            asyncDeclaration.value = asyncValue;
                            asyncQueue.add(() => {
                                if (isAsyncCancelled() || currentRenderId !== renderId) {
                                    return;
                                }
                                rebuildAsyncRule(asyncKey);
                            });
                        });
                    } else {
                        readyDeclarations.push({property, value: modified, important, sourceValue});
                    }
                } else {
                    readyDeclarations.push({property, value, important, sourceValue});
                }
            });
        });

        const sheet = prepareSheet();

        function buildStyleSheet() {
            function createTarget(group: ReadyGroup, parent: CSSStyleSheet | CSSGroupingRule): CSSStyleSheet | CSSGroupingRule {
                const {rule} = group;
                if (rule instanceof CSSMediaRule) {
                    const {media} = rule;
                    const index = parent.cssRules.length;
                    parent.insertRule(`@media ${media.mediaText} {}`, index);
                    return parent.cssRules[index] as CSSMediaRule;
                }
                return parent;
            }

            function iterateReadyRules(
                group: ReadyGroup,
                target: CSSStyleSheet | CSSGroupingRule,
                styleIterator: (s: ReadyStyleRule, t: CSSStyleSheet | CSSGroupingRule) => void,
            ) {
                group.rules.forEach((r) => {
                    if (r.isGroup) {
                        const t = createTarget(r, target);
                        iterateReadyRules(r, t, styleIterator);
                    } else {
                        styleIterator(r as ReadyStyleRule, target);
                    }
                });
            }

            iterateReadyRules(rootReadyGroup, sheet, (rule, target) => {
                const index = target.cssRules.length;
                rule.declarations
                    .filter(({value}) => value == null)
                    .forEach(({asyncKey}) => asyncDeclarations.set(asyncKey, {rule, target, index}));
                setRule(target, index, rule);
            });
        }

        function rebuildAsyncRule(key: number) {
            const {rule, target, index} = asyncDeclarations.get(key);
            target.deleteRule(index);
            setRule(target, index, rule);
            asyncDeclarations.delete(key);
        }

        buildStyleSheet();
    }

    return {modifySheet};
}
