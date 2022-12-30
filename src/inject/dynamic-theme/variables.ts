import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from '../../generators/modify-colors';
import {getParenthesesRange} from '../../utils/text';
import {iterateCSSRules, iterateCSSDeclarations} from './css-rules';
import {getBgImageModifier, getShadowModifierWithInfo} from './modify-css';
import type {CSSValueModifier} from './modify-css';
import type {Theme} from '../../definitions';
import type {RGBA} from '../../utils/color';
import {parseColorWithCache} from '../../utils/color';

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

const VAR_TYPE_BGCOLOR = 1 << 0;
const VAR_TYPE_TEXTCOLOR = 1 << 1;
const VAR_TYPE_BORDERCOLOR = 1 << 2;
const VAR_TYPE_BGIMG = 1 << 3;

export class VariablesStore {
    private varTypes = new Map<string, number>();
    private rulesQueue = [] as CSSRuleList[];
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

    clear() {
        this.varTypes.clear();
        this.rulesQueue.splice(0);
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

    addRulesForMatching(rules: CSSRuleList) {
        this.rulesQueue.push(rules);
    }

    matchVariablesAndDependants() {
        this.changedTypeVars.clear();
        this.initialVarTypes = new Map(this.varTypes);
        this.collectRootVariables();
        this.collectVariablesAndVarDep(this.rulesQueue);
        this.rulesQueue.splice(0);
        this.collectRootVarDependants();

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
                this.resolveVariableType(v, VAR_TYPE_BGCOLOR);
            } else if (this.isVarType(v, VAR_TYPE_BGCOLOR | VAR_TYPE_TEXTCOLOR | VAR_TYPE_BORDERCOLOR)) {
                this.unknownColorVars.delete(v);
            } else {
                this.undefinedVars.add(v);
            }
        });

        this.unknownBgVars.forEach((v) => {
            const hasColor = this.findVarRef(v, (ref) => {
                return (
                    this.unknownColorVars.has(ref) ||
                    this.isVarType(ref, VAR_TYPE_TEXTCOLOR | VAR_TYPE_BORDERCOLOR)
                );
            }) != null;
            if (hasColor) {
                this.itarateVarRefs(v, (ref) => {
                    this.resolveVariableType(ref, VAR_TYPE_BGCOLOR);
                });
            } else if (this.isVarType(v, VAR_TYPE_BGCOLOR | VAR_TYPE_BGIMG)) {
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
                                value = typeNum === VAR_TYPE_BGCOLOR ? '#ffffff' : '#000000';
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

                addModifiedValue(VAR_TYPE_BGCOLOR, wrapBgColorVariableName, tryModifyBgColor);
                addModifiedValue(VAR_TYPE_TEXTCOLOR, wrapTextColorVariableName, tryModifyTextColor);
                addModifiedValue(VAR_TYPE_BORDERCOLOR, wrapBorderColorVariableName, tryModifyBorderColor);
                if (this.isVarType(varName, VAR_TYPE_BGIMG)) {
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
        // TODO(gusted): This condition is incorrect, as the sourceValue still contains a variable.
        // Simply replacing it with some definition is incorrect as variables are element-independent.
        // Fully handling this requires having a function that gives the variable's value given an
        // element's position in the DOM, but that's quite computationally hard to facilitate. We'll
        // probably just handle edge-cases like `rgb(22 163 74/var(--tb-bg-opacity)` and hope that
        // lowering the opacity is enough.
        if (sourceValue.match(/^\s*(rgb|hsl)a?\(/)) {
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
        if (property === 'background-color') {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapBgColorVariableName(v),
                    (fallback) => tryModifyBgColor(fallback, theme),
                );
            };
        }
        if (isTextColorProperty(property)) {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapTextColorVariableName(v),
                    (fallback) => tryModifyTextColor(fallback, theme),
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
                            if (this.isVarType(v, VAR_TYPE_BGCOLOR)) {
                                return wrapBgColorVariableName(v);
                            }
                            if (this.isVarType(v, VAR_TYPE_BGIMG)) {
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
                        if (modifiedShadow.unparseableMatchesLength !== modifiedShadow.matchesLength) {
                            return modifiedShadow.result;
                        }
                    }
                    return variableReplaced;
                };

                const modified = modify();
                if (unknownVars.size > 0) {
                    return new Promise<string>((resolve) => {
                        const firstUnknownVar = unknownVars.values().next().value;
                        const callback = () => {
                            this.unsubscribeFromVariableTypeChanges(firstUnknownVar, callback);
                            const newValue = modify();
                            resolve(newValue);
                        };

                        this.subscribeForVarTypeChange(firstUnknownVar, callback);
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

    // Because of the similar expensive task between the old `collectVariables`
    // and `collectVarDepandant`, we only want to do it once.
    // This function should only do the same expensive task once
    // and ensure that the result comes to the correct task.
    // The task is either `inspectVariable` or `inspectVarDependant`.
    private collectVariablesAndVarDep(ruleList: CSSRuleList[]) {
        ruleList.forEach((rules) => {
            iterateCSSRules(rules, (rule) => {
                rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
                    if (isVariable(property)) {
                        this.inspectVariable(property, value);
                    }
                    if (isVarDependant(value)) {
                        this.inspectVarDependant(property, value);
                    }
                });
            });
        });
    }

    private collectRootVariables() {
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
        const isColor = rawValueRegex.test(value) || parseColorWithCache(value);
        if (isColor) {
            this.unknownColorVars.add(varName);
        } else if (
            value.includes('url(') ||
            value.includes('linear-gradient(') ||
            value.includes('radial-gradient(')
        ) {
            this.resolveVariableType(varName, VAR_TYPE_BGIMG);
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

    private collectRootVarDependants() {
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
            this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_BGCOLOR));
        } else if (isTextColorProperty(property)) {
            this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_TEXTCOLOR));
        } else if (property.startsWith('border') || property.startsWith('outline')) {
            this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_BORDERCOLOR));
        } else if (property === 'background' || property === 'background-image') {
            this.iterateVarDeps(value, (v) => {
                if (this.isVarType(v, VAR_TYPE_BGCOLOR | VAR_TYPE_BGIMG)) {
                    return;
                }
                const isBgColor = this.findVarRef(v, (ref) => {
                    return (
                        this.unknownColorVars.has(ref) ||
                        this.isVarType(ref, VAR_TYPE_TEXTCOLOR | VAR_TYPE_BORDERCOLOR)
                    );
                }) != null;
                this.itarateVarRefs(v, (ref) => {
                    if (isBgColor) {
                        this.resolveVariableType(ref, VAR_TYPE_BGCOLOR);
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

    private itarateVarRefs(varName: string, iterator: (v: string) => void) {
        this.findVarRef(varName, (ref) => {
            iterator(ref);
            return false;
        });
    }

    setOnRootVariableChange(callback: () => void) {
        this.onRootVariableDefined = callback;
    }

    putRootVars(styleElement: HTMLStyleElement, theme: Theme) {
        const sheet = styleElement.sheet!;
        if (sheet.cssRules.length > 0) {
            sheet.deleteRule(0);
        }
        const declarations = new Map<string, string>();
        iterateCSSDeclarations(document.documentElement.style, (property, value) => {
            if (isVariable(property)) {
                if (this.isVarType(property, VAR_TYPE_BGCOLOR)) {
                    declarations.set(wrapBgColorVariableName(property), tryModifyBgColor(value, theme));
                }
                if (this.isVarType(property, VAR_TYPE_TEXTCOLOR)) {
                    declarations.set(wrapTextColorVariableName(property), tryModifyTextColor(value, theme));
                }
                if (this.isVarType(property, VAR_TYPE_BORDERCOLOR)) {
                    declarations.set(wrapBorderColorVariableName(property), tryModifyBorderColor(value, theme));
                }
                this.subscribeForVarTypeChange(property, this.onRootVariableDefined);
            }
        });
        const cssLines = [] as string[];
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

function replaceVariablesMatches(input: string, replacer: (match: string) => string | null) {
    const matches = getVariablesMatches(input);
    const matchesCount = matches.length;
    if (matchesCount === 0) {
        return input;
    }

    const inputLength = input.length;
    const replacements = matches.map((m) => replacer(m.value));
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
): string {
    const matchReplacer = (match: string) => {
        const {name, fallback} = getVariableNameAndFallback(match);
        const newName = nameReplacer(name);
        if (!fallback) {
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
    return value.match(/^\s*(rgb|hsl)a?\(/);
}

function isTextColorProperty(property: string) {
    return property === 'color' || property === 'caret-color' || property === '-webkit-text-fill-color';
}

// ex. 131,123,132 | 1,341, 122
const rawValueRegex = /^\d{1,3}, ?\d{1,3}, ?\d{1,3}$/;

function parseRawValue(color: string) {
    if (rawValueRegex.test(color)) {
        // Convert the raw value into a useable rgb(...) value, such that it can
        // be properly used with other functions that expect such value.
        const splitted = color.split(',');
        let resultInRGB = 'rgb(';
        splitted.forEach((number) => {
            resultInRGB += `${number.trim()}, `;
        });
        resultInRGB = resultInRGB.substring(0, resultInRGB.length - 2);
        resultInRGB += ')';
        return {isRaw: true, color: resultInRGB};
    }
    return {isRaw: false, color: color};
}

function handleRawValue(color: string, theme: Theme, modifyFunction: (rgb: RGBA, theme: Theme) => string) {
    const {isRaw, color: newColor} = parseRawValue(color);

    const rgb = parseColorWithCache(newColor);
    if (rgb) {
        const outputColor = modifyFunction(rgb, theme);

        // If it's raw, we need to convert it back to the "raw" format.
        if (isRaw) {
            // This should technically never fail(returning an empty string),
            // but just to be safe, we will return outputColor.
            const outputInRGB = parseColorWithCache(outputColor);
            return outputInRGB ? `${outputInRGB.r}, ${outputInRGB.g}, ${outputInRGB.b}` : outputColor;
        }
        return outputColor;
    }
    return newColor;
}

function tryModifyBgColor(color: string, theme: Theme) {
    return handleRawValue(color, theme, modifyBackgroundColor);
}

function tryModifyTextColor(color: string, theme: Theme) {
    return handleRawValue(color, theme, modifyForegroundColor);
}

function tryModifyBorderColor(color: string, theme: Theme) {
    return handleRawValue(color, theme, modifyBorderColor);
}

function insertVarValues(source: string, varValues: Map<string, string>, stack = new Set<string>()) {
    let containsUnresolvedVar = false;
    const matchReplacer = (match: string) => {
        const {name, fallback} = getVariableNameAndFallback(match);
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
