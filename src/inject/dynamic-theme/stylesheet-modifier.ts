import type {Theme} from '../../definitions';
import {createAsyncTasksQueue} from '../utils/throttle';
import {iterateCSSRules, iterateCSSDeclarations} from './css-rules';
import type {ModifiableCSSDeclaration, ModifiableCSSRule} from './modify-css';
import {getModifiableCSSDeclaration} from './modify-css';
import {variablesStore} from './variables';
import type {CSSVariableModifier} from './variables';

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
    const rulesTextCache = new Set<string>();
    const rulesModCache = new Map<string, ModifiableCSSRule>();
    const varTypeChangeCleaners = new Set<() => void>();
    let prevFilterKey: string = null;
    interface ModifySheetOptions {
        sourceCSSRules: CSSRuleList;
        theme: Theme;
        ignoreImageAnalysis: string[];
        force: boolean;
        prepareSheet: () => CSSStyleSheet;
        isAsyncCancelled: () => boolean;
    }

    let hasNonLoadedLink = false;
    let wasRebuilt = false;
    function shouldRebuildStyle() {
        return hasNonLoadedLink && !wasRebuilt;
    }

    function modifySheet(options: ModifySheetOptions) {
        const rules = options.sourceCSSRules;
        const {theme, ignoreImageAnalysis, force, prepareSheet, isAsyncCancelled} = options;

        let rulesChanged = (rulesModCache.size === 0);
        const notFoundCacheKeys = new Set(rulesModCache.keys());
        const themeKey = getThemeKey(theme);
        const themeChanged = (themeKey !== prevFilterKey);

        if (hasNonLoadedLink) {
            wasRebuilt = true;
        }

        const modRules: ModifiableCSSRule[] = [];
        iterateCSSRules(rules, (rule) => {
            let cssText = rule.cssText;
            let textDiffersFromPrev = false;

            notFoundCacheKeys.delete(cssText);
            if (rule.parentRule instanceof CSSMediaRule) {
                cssText += `;${ (rule.parentRule as CSSMediaRule).media.mediaText}`;
            }
            if (!rulesTextCache.has(cssText)) {
                rulesTextCache.add(cssText);
                textDiffersFromPrev = true;
            }

            if (textDiffersFromPrev) {
                rulesChanged = true;
            } else {
                modRules.push(rulesModCache.get(cssText));
                return;
            }

            const modDecs: ModifiableCSSDeclaration[] = [];
            rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
                const mod = getModifiableCSSDeclaration(property, value, rule, variablesStore, ignoreImageAnalysis, isAsyncCancelled);
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
        }, () => {
            hasNonLoadedLink = true;
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
            value: string | Array<{property: string; value: string}>;
            important: boolean;
            sourceValue: string;
            asyncKey?: number;
            varKey?: number;
        }

        function setRule(target: CSSStyleSheet | CSSGroupingRule, index: number, rule: ReadyStyleRule) {
            const {selector, declarations} = rule;
            const getDeclarationText = (dec: ReadyDeclaration) => {
                const {property, value, important, sourceValue} = dec;
                return `${property}: ${value == null ? sourceValue : value}${important ? ' !important' : ''};`;
            };
            const ruleText = `${selector} { ${declarations.map(getDeclarationText).join(' ')} }`;
            target.insertRule(ruleText, index);
        }

        interface RuleInfo {
            rule: ReadyStyleRule;
            target: (CSSStyleSheet | CSSGroupingRule);
            index: number;
        }

        const asyncDeclarations = new Map<number, RuleInfo>();
        const varDeclarations = new Map<number, RuleInfo>();
        let asyncDeclarationCounter = 0;
        let varDeclarationCounter = 0;

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

        varTypeChangeCleaners.forEach((clear) => clear());
        varTypeChangeCleaners.clear();

        modRules.filter((r) => r).forEach(({selector, declarations, parentRule}) => {
            const group = getGroup(parentRule);
            const readyStyleRule: ReadyStyleRule = {selector, declarations: [], isGroup: false};
            const readyDeclarations = readyStyleRule.declarations;
            group.rules.push(readyStyleRule);

            function handleAsyncDeclaration(property: string, modified: Promise<string>, important: boolean, sourceValue: string) {
                const asyncKey = ++asyncDeclarationCounter;
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
            }

            function handleVarDeclarations(property: string, modified: ReturnType<CSSVariableModifier>, important: boolean, sourceValue: string) {
                const {declarations: varDecs, onTypeChange} = modified as ReturnType<CSSVariableModifier>;
                const varKey = ++varDeclarationCounter;
                const currentRenderId = renderId;
                const initialIndex = readyDeclarations.length;
                let oldDecs: ReadyDeclaration[] = [];
                if (varDecs.length === 0) {
                    const tempDec = {property, value: sourceValue, important, sourceValue, varKey};
                    readyDeclarations.push(tempDec);
                    oldDecs = [tempDec];
                }
                varDecs.forEach((mod) => {
                    if (mod.value instanceof Promise) {
                        handleAsyncDeclaration(mod.property, mod.value, important, sourceValue);
                    } else {
                        const readyDec = {property: mod.property, value: mod.value, important, sourceValue, varKey};
                        readyDeclarations.push(readyDec);
                        oldDecs.push(readyDec);
                    }
                });
                onTypeChange.addListener((newDecs) => {
                    if (isAsyncCancelled() || currentRenderId !== renderId) {
                        return;
                    }
                    const readyVarDecs = newDecs.map((mod) => {
                        return {property: mod.property, value: mod.value as string, important, sourceValue, varKey};
                    });
                    // TODO: Don't search for index, store some way or use Linked List.
                    const index = readyDeclarations.indexOf(oldDecs[0], initialIndex);
                    readyDeclarations.splice(index, oldDecs.length, ...readyVarDecs);
                    oldDecs = readyVarDecs;
                    rebuildVarRule(varKey);
                });
                varTypeChangeCleaners.add(() => onTypeChange.removeListeners());
            }

            declarations.forEach(({property, value, important, sourceValue}) => {
                if (typeof value === 'function') {
                    const modified = value(theme);
                    if (modified instanceof Promise) {
                        handleAsyncDeclaration(property, modified, important, sourceValue);
                    } else if (property.startsWith('--')) {
                        handleVarDeclarations(property, modified as any, important, sourceValue);
                    } else {
                        readyDeclarations.push({property, value: modified as string, important, sourceValue});
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
                rule.declarations.forEach(({asyncKey, varKey}) => {
                    if (asyncKey != null) {
                        asyncDeclarations.set(asyncKey, {rule, target, index});
                    }
                    if (varKey != null) {
                        varDeclarations.set(varKey, {rule, target, index});
                    }
                });
                setRule(target, index, rule);
            });
        }

        function rebuildAsyncRule(key: number) {
            const {rule, target, index} = asyncDeclarations.get(key);
            target.deleteRule(index);
            setRule(target, index, rule);
            asyncDeclarations.delete(key);
        }

        function rebuildVarRule(key: number) {
            const {rule, target, index} = varDeclarations.get(key);
            target.deleteRule(index);
            setRule(target, index, rule);
        }

        buildStyleSheet();
    }

    return {modifySheet, shouldRebuildStyle};
}
