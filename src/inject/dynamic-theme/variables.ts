import type {Theme} from '../../definitions';
import type {RGBA} from '../../utils/color';
import {parseColorWithCache} from '../../utils/color';
import {getParenthesesRange} from '../../utils/text';

import {iterateCSSRules, iterateCSSDeclarations} from './css-rules';
import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from './modify-colors';
import {getBgImageModifier, getShadowModifierWithInfo} from './modify-css';
import type {CSSValueModifier} from './modify-css';

export interface ModifiedVarDeclaration {
    property: string;
    value: string | Promise<string | null>;
}

export type CSSVariableModifier = (theme: Theme) => {
    declarations: ModifiedVarDeclaration[];
    onTypeChange: {
        addListener: (callback: (declarations: ModifiedVarDeclaration[]) => void) => void;
        removeListeners: () => void;
    };
};

const VAR_TYPE_BG_COLOR = 1 << 0;
const VAR_TYPE_TEXT_COLOR = 1 << 1;
const VAR_TYPE_BORDER_COLOR = 1 << 2;
const VAR_TYPE_BG_IMG = 1 << 3;

const shouldSetDefaultColor = !location.hostname.startsWith('www.ebay.') && !location.hostname.includes('.ebay.');

export class VariablesStore {
    private varTypes = new Map<string, number>();
    private rulesQueue = new Set<CSSRuleList | CSSRule[]>();
    private inlineStyleQueue: CSSStyleDeclaration[] = [];
    private definedVars = new Set<string>();
    private varRefs = new Map<string, Set<string>>();
    private unknownColorVars = new Set<string>();
    private unknownBgVars = new Set<string>();
    private undefinedVars = new Set<string>();
    private initialVarTypes = new Map<string, number>();
    private changedTypeVars = new Set<string>();
    private typeChangeSubscriptions = new Map<string, Set<() => void>>();
    private unstableVarValues = new Map<string, string>();
    private onRootVariableDefined: () => void;

    clear(): void {
        this.varTypes.clear();
        this.rulesQueue.clear();
        this.inlineStyleQueue.splice(0);
        this.definedVars.clear();
        this.varRefs.clear();
        this.unknownColorVars.clear();
        this.unknownBgVars.clear();
        this.undefinedVars.clear();
        this.initialVarTypes.clear();
        this.changedTypeVars.clear();
        this.typeChangeSubscriptions.clear();
        this.unstableVarValues.clear();
    }

    private isVarType(varName: string, typeNum: number) {
        return (
            this.varTypes.has(varName) &&
            (this.varTypes.get(varName)! & typeNum) > 0
        );
    }

    addRulesForMatching(rules: CSSRuleList | CSSRule[]): void {
        this.rulesQueue.add(rules);
    }

    addInlineStyleForMatching(style: CSSStyleDeclaration): void {
        this.inlineStyleQueue.push(style);
    }

    matchVariablesAndDependents(): void {
        if (this.rulesQueue.size === 0 && this.inlineStyleQueue.length === 0) {
            return;
        }
        this.changedTypeVars.clear();
        this.initialVarTypes = new Map(this.varTypes);
        this.collectRootVariables();
        this.collectVariablesAndVarDep();
        this.collectRootVarDependents();

        this.varRefs.forEach((refs, v) => {
            refs.forEach((r) => {
                if (this.varTypes.has(v)) {
                    this.resolveVariableType(r, this.varTypes.get(v)!);
                }
            });
        });

        this.unknownColorVars.forEach((v) => {
            if (this.unknownBgVars.has(v)) {
                this.unknownColorVars.delete(v);
                this.unknownBgVars.delete(v);
                this.resolveVariableType(v, VAR_TYPE_BG_COLOR);
            } else if (this.isVarType(v, VAR_TYPE_BG_COLOR | VAR_TYPE_TEXT_COLOR | VAR_TYPE_BORDER_COLOR)) {
                this.unknownColorVars.delete(v);
            } else {
                this.undefinedVars.add(v);
            }
        });

        this.unknownBgVars.forEach((v) => {
            const hasColor = this.findVarRef(v, (ref) => {
                return (
                    this.unknownColorVars.has(ref) ||
                    this.isVarType(ref, VAR_TYPE_BG_COLOR | VAR_TYPE_TEXT_COLOR | VAR_TYPE_BORDER_COLOR)
                );
            }) != null;
            if (hasColor) {
                this.iterateVarRefs(v, (ref) => {
                    this.resolveVariableType(ref, VAR_TYPE_BG_COLOR);
                });
            } else if (this.isVarType(v, VAR_TYPE_BG_COLOR | VAR_TYPE_BG_IMG)) {
                this.unknownBgVars.delete(v);
            } else {
                this.undefinedVars.add(v);
            }
        });

        this.changedTypeVars.forEach((varName) => {
            if (this.typeChangeSubscriptions.has(varName)) {
                this.typeChangeSubscriptions
                    .get(varName)!
                    .forEach((callback) => {
                        callback();
                    });
            }
        });
        this.changedTypeVars.clear();
    }

    getModifierForVariable(options: {
        varName: string;
        sourceValue: string;
        rule: CSSStyleRule;
        ignoredImgSelectors: string[];
        isCancelled: () => boolean;
    }): CSSVariableModifier {
        return (theme) => {
            const {varName, sourceValue, rule, ignoredImgSelectors, isCancelled} = options;

            const getDeclarations = () => {
                const declarations: ModifiedVarDeclaration[] = [];

                const addModifiedValue = (
                    typeNum: number,
                    varNameWrapper: (name: string) => string,
                    colorModifier: (c: string, t: Theme) => string,
                ) => {
                    if (!this.isVarType(varName, typeNum)) {
                        return;
                    }
                    const property = varNameWrapper(varName);
                    let modifiedValue: string;
                    if (isVarDependant(sourceValue)) {
                        if (isConstructedColorVar(sourceValue)) {
                            let value = insertVarValues(sourceValue, this.unstableVarValues);
                            if (!value) {
                                value = typeNum === VAR_TYPE_BG_COLOR ? '#ffffff' : '#000000';
                            }
                            modifiedValue = colorModifier(value, theme);
                        } else {
                            modifiedValue = replaceCSSVariablesNames(
                                sourceValue,
                                (v) => varNameWrapper(v),
                                (fallback) => colorModifier(fallback, theme),
                            );
                        }
                    } else {
                        modifiedValue = colorModifier(sourceValue, theme);
                    }
                    declarations.push({
                        property,
                        value: modifiedValue,
                    });
                };

                addModifiedValue(VAR_TYPE_BG_COLOR, wrapBgColorVariableName, tryModifyBgColor);
                addModifiedValue(VAR_TYPE_TEXT_COLOR, wrapTextColorVariableName, tryModifyTextColor);
                addModifiedValue(VAR_TYPE_BORDER_COLOR, wrapBorderColorVariableName, tryModifyBorderColor);
                if (this.isVarType(varName, VAR_TYPE_BG_IMG)) {
                    const property = wrapBgImgVariableName(varName);
                    let modifiedValue: string | Promise<string | null> = sourceValue;
                    if (isVarDependant(sourceValue)) {
                        modifiedValue = replaceCSSVariablesNames(
                            sourceValue,
                            (v) => wrapBgColorVariableName(v),
                            (fallback) => tryModifyBgColor(fallback, theme),
                        );
                    }
                    const bgModifier = getBgImageModifier(modifiedValue, rule, ignoredImgSelectors, isCancelled);
                    modifiedValue = typeof bgModifier === 'function' ? bgModifier(theme) : bgModifier!;
                    declarations.push({
                        property,
                        value: modifiedValue,
                    });
                }

                return declarations;
            };

            const callbacks = new Set<() => void>();

            const addListener = (onTypeChange: (decs: ModifiedVarDeclaration[]) => void) => {
                const callback = () => {
                    const decs = getDeclarations();
                    onTypeChange(decs);
                };

                callbacks.add(callback);
                this.subscribeForVarTypeChange(varName, callback);
            };

            const removeListeners = () => {
                callbacks.forEach((callback) => {
                    this.unsubscribeFromVariableTypeChanges(varName, callback);
                });
            };

            return {
                declarations: getDeclarations(),
                onTypeChange: {addListener, removeListeners},
            };
        };
    }

    getModifierForVarDependant(property: string, sourceValue: string): CSSValueModifier | null {
        const isConstructedColor = sourceValue.match(/^\s*(rgb|hsl)a?\(/);
        const isSimpleConstructedColor = sourceValue.match(/^rgba?\(var\(--[\-_A-Za-z0-9]+\)(\s*,?\/?\s*0?\.\d+)?\)$/);
        if (isConstructedColor && !isSimpleConstructedColor) {
            const isBg = property.startsWith('background');
            const isText = isTextColorProperty(property);
            return (theme) => {
                let value = insertVarValues(sourceValue, this.unstableVarValues);
                if (!value) {
                    value = isBg ? '#ffffff' : '#000000';
                }
                const modifier = isBg ? tryModifyBgColor : isText ? tryModifyTextColor : tryModifyBorderColor;
                return modifier(value, theme);
            };
        }
        if (property === 'background-color' || (isSimpleConstructedColor && property === 'background')) {
            return (theme) => {
                const defaultFallback = shouldSetDefaultColor ?
                    tryModifyBgColor(isConstructedColor ? '255, 255, 255' : '#ffffff', theme) :
                    'transparent';
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapBgColorVariableName(v),
                    (fallback) => tryModifyBgColor(fallback, theme),
                    defaultFallback,
                );
            };
        }
        if (isTextColorProperty(property)) {
            return (theme) => {
                const defaultFallback = tryModifyTextColor(isConstructedColor ? '0, 0, 0' : '#000000', theme);
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapTextColorVariableName(v),
                    (fallback) => tryModifyTextColor(fallback, theme),
                    defaultFallback,
                );
            };
        }
        if (property === 'background' || property === 'background-image' || property === 'box-shadow') {
            return (theme) => {
                const unknownVars = new Set<string>();
                const modify = () => {
                    const variableReplaced = replaceCSSVariablesNames(
                        sourceValue,
                        (v) => {
                            if (this.isVarType(v, VAR_TYPE_BG_COLOR)) {
                                return wrapBgColorVariableName(v);
                            }
                            if (this.isVarType(v, VAR_TYPE_BG_IMG)) {
                                return wrapBgImgVariableName(v);
                            }
                            unknownVars.add(v);
                            return v;
                        },
                        (fallback) => tryModifyBgColor(fallback, theme),
                    );
                    // Check if the property is box-shadow and if so, do a pass-through to modify the shadow.
                    if (property === 'box-shadow') {
                        const shadowModifier = getShadowModifierWithInfo(variableReplaced)!;
                        const modifiedShadow = shadowModifier(theme);
                        if (modifiedShadow.unparsableMatchesLength !== modifiedShadow.matchesLength) {
                            return modifiedShadow.result;
                        }
                    }
                    return variableReplaced;
                };

                const modified = modify();
                if (unknownVars.size > 0) {
                    // web.dev and voice.google.com issue where the variable is never defined, but the fallback is.
                    // TODO: Return a fallback value along with a way to subscribe for a change.
                    if (isFallbackResolved(modified)) {
                        return modified;
                    }
                    return new Promise<string>((resolve) => {
                        for (const unknownVar of unknownVars.values()) {
                            const callback = () => {
                                this.unsubscribeFromVariableTypeChanges(unknownVar, callback);
                                const newValue = modify();
                                resolve(newValue);
                            };
                            this.subscribeForVarTypeChange(unknownVar, callback);
                        }
                    });
                }

                return modified;
            };
        }
        if (property.startsWith('border') || property.startsWith('outline')) {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapBorderColorVariableName(v),
                    (fallback) => tryModifyBorderColor(fallback, theme),
                );
            };
        }
        return null;
    }

    private subscribeForVarTypeChange(varName: string, callback: () => void) {
        if (!this.typeChangeSubscriptions.has(varName)) {
            this.typeChangeSubscriptions.set(varName, new Set());
        }
        const rootStore = this.typeChangeSubscriptions.get(varName)!;
        if (!rootStore.has(callback)) {
            rootStore.add(callback);
        }
    }

    private unsubscribeFromVariableTypeChanges(varName: string, callback: () => void) {
        if (this.typeChangeSubscriptions.has(varName)) {
            this.typeChangeSubscriptions.get(varName)!.delete(callback);
        }
    }

    private collectVariablesAndVarDep() {
        this.rulesQueue.forEach((rules) => {
            iterateCSSRules(rules, (rule) => {
                if (rule.style) {
                    this.collectVarsFromCSSDeclarations(rule.style);
                }
            });
        });
        this.inlineStyleQueue.forEach((style) => {
            this.collectVarsFromCSSDeclarations(style);
        });
        this.rulesQueue.clear();
        this.inlineStyleQueue.splice(0);
    }

    private collectVarsFromCSSDeclarations(style: CSSStyleDeclaration) {
        iterateCSSDeclarations(style, (property, value) => {
            if (isVariable(property)) {
                this.inspectVariable(property, value);
            }
            if (isVarDependant(value)) {
                this.inspectVarDependant(property, value);
            }
        });
    }

    private shouldProcessRootVariables() {
        return (
            this.rulesQueue.size > 0 &&
            document.documentElement.getAttribute('style')?.includes('--')
        );
    }

    private collectRootVariables() {
        if (!this.shouldProcessRootVariables()) {
            return;
        }
        iterateCSSDeclarations(document.documentElement.style, (property, value) => {
            if (isVariable(property)) {
                this.inspectVariable(property, value);
            }
        });
    }

    private inspectVariable(varName: string, value: string) {
        this.unstableVarValues.set(varName, value);

        if (isVarDependant(value) && isConstructedColorVar(value)) {
            this.unknownColorVars.add(varName);
            this.definedVars.add(varName);
        }
        if (this.definedVars.has(varName)) {
            return;
        }
        this.definedVars.add(varName);

        // Check if the value is either a raw value or a value that can be parsed
        // e.g. rgb, hsl.
        const isColor = Boolean(
            value.match(rawRGBSpaceRegex) ||
            value.match(rawRGBCommaRegex) ||
            parseColorWithCache(value)
        );
        if (isColor) {
            this.unknownColorVars.add(varName);
        } else if (
            value.includes('url(') ||
            value.includes('linear-gradient(') ||
            value.includes('radial-gradient(')
        ) {
            this.resolveVariableType(varName, VAR_TYPE_BG_IMG);
        }
    }

    private resolveVariableType(varName: string, typeNum: number) {
        const initialType = this.initialVarTypes.get(varName) || 0;
        const currentType = this.varTypes.get(varName) || 0;
        const newType = currentType | typeNum;
        this.varTypes.set(varName, newType);
        if (newType !== initialType || this.undefinedVars.has(varName)) {
            this.changedTypeVars.add(varName);
            this.undefinedVars.delete(varName);
        }
        this.unknownColorVars.delete(varName);
        this.unknownBgVars.delete(varName);
    }

    private collectRootVarDependents() {
        if (!this.shouldProcessRootVariables()) {
            return;
        }
        iterateCSSDeclarations(document.documentElement.style, (property, value) => {
            if (isVarDependant(value)) {
                this.inspectVarDependant(property, value);
            }
        });
    }

    private inspectVarDependant(property: string, value: string) {
        if (isVariable(property)) {
            this.iterateVarDeps(value, (ref) => {
                if (!this.varRefs.has(property)) {
                    this.varRefs.set(property, new Set());
                }
                this.varRefs.get(property)!.add(ref);
            });
        } else if (property === 'background-color' || property === 'box-shadow') {
            this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_BG_COLOR));
        } else if (isTextColorProperty(property)) {
            this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_TEXT_COLOR));
        } else if (property.startsWith('border') || property.startsWith('outline')) {
            this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_BORDER_COLOR));
        } else if (property === 'background' || property === 'background-image') {
            this.iterateVarDeps(value, (v) => {
                if (this.isVarType(v, VAR_TYPE_BG_COLOR | VAR_TYPE_BG_IMG)) {
                    return;
                }
                const isBgColor = this.findVarRef(v, (ref) => {
                    return (
                        this.unknownColorVars.has(ref) ||
                        this.isVarType(ref, VAR_TYPE_BG_COLOR | VAR_TYPE_TEXT_COLOR | VAR_TYPE_BORDER_COLOR)
                    );
                }) != null;
                this.iterateVarRefs(v, (ref) => {
                    if (isBgColor) {
                        this.resolveVariableType(ref, VAR_TYPE_BG_COLOR);
                    } else {
                        this.unknownBgVars.add(ref);
                    }
                });
            });
        }
    }

    private iterateVarDeps(
        value: string,
        iterator: (varDep: string) => void,
    ) {
        const varDeps = new Set<string>();
        iterateVarDependencies(value, (v) => varDeps.add(v));
        varDeps.forEach((v) => iterator(v));
    }

    private findVarRef(varName: string, iterator: (v: string) => boolean, stack = new Set<string>()): string | null {
        if (stack.has(varName)) {
            return null;
        }
        stack.add(varName);
        const result = iterator(varName);
        if (result) {
            return varName;
        }
        const refs = this.varRefs.get(varName);
        if (!refs || refs.size === 0) {
            return null;
        }
        for (const ref of refs) {
            const found = this.findVarRef(ref, iterator, stack);
            if (found) {
                return found;
            }
        }
        return null;
    }

    private iterateVarRefs(varName: string, iterator: (v: string) => void) {
        this.findVarRef(varName, (ref) => {
            iterator(ref);
            return false;
        });
    }

    setOnRootVariableChange(callback: () => void): void {
        this.onRootVariableDefined = callback;
    }

    putRootVars(styleElement: HTMLStyleElement, theme: Theme): void {
        const sheet = styleElement.sheet!;
        if (sheet.cssRules.length > 0) {
            sheet.deleteRule(0);
        }
        const declarations = new Map<string, string>();
        iterateCSSDeclarations(document.documentElement.style, (property, value) => {
            if (isVariable(property)) {
                if (this.isVarType(property, VAR_TYPE_BG_COLOR)) {
                    declarations.set(wrapBgColorVariableName(property), tryModifyBgColor(value, theme));
                }
                if (this.isVarType(property, VAR_TYPE_TEXT_COLOR)) {
                    declarations.set(wrapTextColorVariableName(property), tryModifyTextColor(value, theme));
                }
                if (this.isVarType(property, VAR_TYPE_BORDER_COLOR)) {
                    declarations.set(wrapBorderColorVariableName(property), tryModifyBorderColor(value, theme));
                }
                this.subscribeForVarTypeChange(property, this.onRootVariableDefined);
            }
        });
        const cssLines: string[] = [];
        cssLines.push(':root {');
        for (const [property, value] of declarations) {
            cssLines.push(`    ${property}: ${value};`);
        }
        cssLines.push('}');
        const cssText = cssLines.join('\n');
        sheet.insertRule(cssText);
    }
}

export const variablesStore = new VariablesStore();

interface Range {
    start: number;
    end: number;
}

interface VariableMatch extends Range {
    value: string;
}

function getVariableRange(input: string, searchStart = 0): Range | null {
    const start = input.indexOf('var(', searchStart);
    if (start >= 0) {
        const range = getParenthesesRange(input, start + 3);
        if (range) {
            return {start, end: range.end};
        }
    }
    return null;
}

function getVariablesMatches(input: string): VariableMatch[] {
    const ranges: VariableMatch[] = [];
    let i = 0;
    let range: Range | null;
    while ((range = getVariableRange(input, i))) {
        const {start, end} = range;
        ranges.push({start, end, value: input.substring(start, end)});
        i = range.end + 1;
    }
    return ranges;
}

function replaceVariablesMatches(input: string, replacer: (match: string, count: number) => string | null) {
    const matches = getVariablesMatches(input);
    const matchesCount = matches.length;
    if (matchesCount === 0) {
        return input;
    }

    const inputLength = input.length;
    const replacements = matches.map((m) => replacer(m.value, matches.length));
    const parts: Array<string | null> = [];
    parts.push(input.substring(0, matches[0].start));
    for (let i = 0; i < matchesCount; i++) {
        parts.push(replacements[i]);
        const start = matches[i].end;
        const end = i < matchesCount - 1 ? matches[i + 1].start : inputLength;
        parts.push(input.substring(start, end));
    }
    return parts.join('');
}

function getVariableNameAndFallback(match: string) {
    const commaIndex = match.indexOf(',');
    let name: string;
    let fallback: string;
    if (commaIndex >= 0) {
        name = match.substring(4, commaIndex).trim();
        fallback = match.substring(commaIndex + 1, match.length - 1).trim();
    } else {
        name = match.substring(4, match.length - 1).trim();
        fallback = '';
    }
    return {name, fallback};
}

export function replaceCSSVariablesNames(
    value: string,
    nameReplacer: (varName: string) => string,
    fallbackReplacer?: (fallbackValue: string) => string,
    finalFallback?: string,
): string {
    const matchReplacer = (match: string) => {
        const {name, fallback} = getVariableNameAndFallback(match);
        const newName = nameReplacer(name);
        if (!fallback) {
            if (finalFallback) {
                return `var(${newName}, ${finalFallback})`;
            }
            return `var(${newName})`;
        }

        let newFallback: string;
        if (isVarDependant(fallback)) {
            newFallback = replaceCSSVariablesNames(fallback, nameReplacer, fallbackReplacer);
        } else if (fallbackReplacer) {
            newFallback = fallbackReplacer(fallback);
        } else {
            newFallback = fallback;
        }
        return `var(${newName}, ${newFallback})`;
    };

    return replaceVariablesMatches(value, matchReplacer);
}

function iterateVarDependencies(value: string, iterator: (varName: string) => void) {
    replaceCSSVariablesNames(value, (varName) => {
        iterator(varName);
        return varName;
    });
}

function wrapBgColorVariableName(name: string) {
    return `--darkreader-bg${name}`;
}

function wrapTextColorVariableName(name: string) {
    return `--darkreader-text${name}`;
}

function wrapBorderColorVariableName(name: string) {
    return `--darkreader-border${name}`;
}

function wrapBgImgVariableName(name: string) {
    return `--darkreader-bgimg${name}`;
}

function isVariable(property: string) {
    return property.startsWith('--');
}

function isVarDependant(value: string) {
    return value.includes('var(');
}

function isConstructedColorVar(value: string) {
    return (
        value.match(/^\s*(rgb|hsl)a?\(/) ||
        value.match(/^(((\d{1,3})|(var\([\-_A-Za-z0-9]+\))),?\s*?){3}$/)
    );
}

function isFallbackResolved(modified: string) {
    if (modified.startsWith('var(') && modified.endsWith(')')) {
        const hasNestedBrackets = modified.endsWith('))');
        const hasDoubleNestedBrackets = modified.endsWith(')))');
        const lastOpenBracketIndex = hasNestedBrackets ? modified.lastIndexOf('(') : -1;
        const firstOpenBracketIndex = hasDoubleNestedBrackets ? modified.lastIndexOf('(', lastOpenBracketIndex - 1) : lastOpenBracketIndex;

        const commaIndex = modified.lastIndexOf(',', hasNestedBrackets ? firstOpenBracketIndex : modified.length);
        if (commaIndex < 0 || modified[commaIndex + 1] !== ' ') {
            return false;
        }

        const fallback = modified.slice(commaIndex + 2, modified.length - 1);
        if (hasNestedBrackets) {
            return (
                fallback.startsWith('rgb(') ||
                fallback.startsWith('rgba(') ||
                fallback.startsWith('hsl(') ||
                fallback.startsWith('hsla(') ||
                fallback.startsWith('var(--darkreader-bg--') ||
                fallback.startsWith('var(--darkreader-background-') ||
                (hasDoubleNestedBrackets && fallback.includes('var(--darkreader-background-'))
            );
        }
        return fallback.match(/^(#[0-9a-f]+)|([a-z]+)$/i);
    }

    return false;
}

const textColorProps = [
    'color',
    'caret-color',
    '-webkit-text-fill-color',
    'fill',
    'stroke',
];

function isTextColorProperty(property: string) {
    return textColorProps.includes(property);
}

// [number] [number] [number] / [number]
const rawRGBSpaceRegex = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*(\/\s*\d+\.?\d*)?$/;
// [number], [number], [number]
const rawRGBCommaRegex = /^(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})$/;

function parseRawColorValue(input: string) {
    const match = input.match(rawRGBSpaceRegex) ?? input.match(rawRGBCommaRegex);
    if (match) {
        const color = match[4] ?
            `rgb(${match[1]} ${match[2]} ${match[3]} / ${match[4]})` :
            `rgb(${match[1]}, ${match[2]}, ${match[3]})`;
        return {isRaw: true, color};
    }
    return {isRaw: false, color: input};
}

function handleRawColorValue(
    input: string,
    theme: Theme,
    modifyFunction: (rgb: RGBA, theme: Theme, useRegisteredVarColor?: boolean) => string,
) {
    const {isRaw, color} = parseRawColorValue(input);

    const rgb = parseColorWithCache(color);
    if (rgb) {
        const outputColor = modifyFunction(rgb, theme, !isRaw);

        // If it's raw, we need to convert it back to the "raw" format.
        if (isRaw) {
            // This should technically never fail(returning an empty string),
            // but just to be safe, we will return outputColor.
            const outputInRGB = parseColorWithCache(outputColor);
            return outputInRGB ? `${outputInRGB.r}, ${outputInRGB.g}, ${outputInRGB.b}` : outputColor;
        }
        return outputColor;
    }
    return color;
}

function tryModifyBgColor(color: string, theme: Theme) {
    return handleRawColorValue(color, theme, modifyBackgroundColor);
}

function tryModifyTextColor(color: string, theme: Theme) {
    return handleRawColorValue(color, theme, modifyForegroundColor);
}

function tryModifyBorderColor(color: string, theme: Theme) {
    return handleRawColorValue(color, theme, modifyBorderColor);
}

function insertVarValues(source: string, varValues: Map<string, string>, fullStack = new Set<string>()) {
    let containsUnresolvedVar = false;
    const matchReplacer = (match: string, count: number) => {
        const {name, fallback} = getVariableNameAndFallback(match);
        const stack = count > 1 ? new Set(fullStack) : fullStack;
        if (stack.has(name)) {
            containsUnresolvedVar = true;
            return null;
        }
        stack.add(name);
        const varValue = varValues.get(name) || fallback;
        let inserted: string | null = null;
        if (varValue) {
            if (isVarDependant(varValue)) {
                inserted = insertVarValues(varValue, varValues, stack);
            } else {
                inserted = varValue;
            }
        }
        if (!inserted) {
            containsUnresolvedVar = true;
            return null;
        }
        return inserted;
    };

    const replaced = replaceVariablesMatches(source, matchReplacer);
    if (containsUnresolvedVar) {
        return null;
    }
    return replaced;
}
