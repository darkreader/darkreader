import {Theme} from '../../definitions';
import {isCSSStyleSheetConstructorSupported} from '../../utils/platform';
import {createAsyncTasksQueue} from '../utils/throttle';
import {iterateCSSRules, iterateCSSDeclarations, replaceCSSVariables} from './css-rules';
import {getModifiableCSSDeclaration, ModifiableCSSDeclaration, ModifiableCSSRule} from './modify-css';

function getThemeKey(theme: Theme) {
    return [
        'mode',
        'brightness',
        'contrast',
        'grayscale',
        'sepia',
    ].map((p) => `${p}:${theme[p]}`).join(';');
}

function getTempCSSStyleSheet(): {sheet: CSSStyleSheet; remove: () => void} {
    if (isCSSStyleSheetConstructorSupported()) {
        return {sheet: new CSSStyleSheet(), remove: () => null};
    }
    const style = document.createElement('style');
    style.classList.add('darkreader');
    style.classList.add('darkreader--temp');
    style.media = 'screen';
    (document.head || document).append(style);
    return {sheet: style.sheet, remove: () => style.remove()};
}

const asyncQueue = createAsyncTasksQueue();

export function createStyleSheetModifier() {
    let renderId = 0;
    const rulesTextCache = new Map<string, string>();
    const rulesModCache = new Map<string, ModifiableCSSRule>();
    let prevFilterKey: string = null;

    interface ModifySheetOptions {
        sourceCSSRules: CSSRuleList;
        theme: Theme;
        variables: Map<string, string>;
        force: boolean;
        prepareSheet: () => CSSStyleSheet;
        isAsyncCancelled: () => boolean;
    }

    function modifySheet(options: ModifySheetOptions): void {
        const rules = options.sourceCSSRules;
        const {theme, variables, force, prepareSheet, isAsyncCancelled} = options;

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
            let vars: {sheet: CSSStyleSheet; remove: () => void};
            let varsRule: CSSStyleRule = null;
            if (variables.size > 0 || cssText.includes('var(')) {
                const cssTextWithVariables = replaceCSSVariables(cssText, variables);
                if (rulesTextCache.get(cssText) !== cssTextWithVariables) {
                    rulesTextCache.set(cssText, cssTextWithVariables);
                    textDiffersFromPrev = true;
                    vars = getTempCSSStyleSheet();
                    vars.sheet.insertRule(cssTextWithVariables);
                    varsRule = vars.sheet.cssRules[0] as CSSStyleRule;
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
                const mod = getModifiableCSSDeclaration(property, value, rule, isAsyncCancelled);
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

            vars && vars.remove();
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
            rules: (ReadyGroup | ReadyStyleRule)[];
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
            const style = (target.cssRules.item(index) as CSSStyleRule).style;
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
        const parentGroupRefs = new WeakMap<CSSRule, ReadyGroup>();

        modRules.filter((r) => r).forEach(({selector, declarations, parentRule}) => {
            let group: ReadyGroup;
            if (parentRule == null) {
                group = rootReadyGroup;
            } else if (parentGroupRefs.has(parentRule)) {
                group = parentGroupRefs.get(parentRule);
            } else {
                group = {rule: parentRule, rules: [], isGroup: true};
                parentGroupRefs.set(parentRule, group);
                const grandParent = (parentRule as CSSRule).parentRule;
                const parentGroup = grandParent ? parentGroupRefs.get(grandParent) : rootReadyGroup;
                parentGroup.rules.push(group);
            }

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
                        const promise = modified;
                        const currentRenderId = renderId;
                        promise.then((asyncValue) => {
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
                    parent.insertRule(`@media ${media} {}`, index);
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
