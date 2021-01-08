import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor} from '../../generators/modify-colors';
import {getParenthesesRange} from '../../utils/text';
import {iterateCSSRules, iterateCSSDeclarations} from './css-rules';
import {tryParseColor, getBgImageModifier} from './modify-css';
import type {Theme} from '../../definitions';

export interface ModifiedVarDeclaration {
    property: string;
    value: string | Promise<string>;
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

class VariablesStore {
    private varTypes = new Map<string, number>();
    private rulesQueue = [] as CSSRuleList[];
    private definedVars = new Set<string>();
    private varRefs = new Map<string, Set<string>>();
    private unknownColorVars = new Set<string>();
    private undefinedVars = new Set<string>();
    private initialVarTypes = new Map<string, number>();
    private changedTypeVars = new Set<string>();
    private typeChangeSubscriptions = new Map<string, Set<() => void>>();

    clear() {
        this.varTypes.clear();
        this.rulesQueue.splice(0);
        this.definedVars.clear();
        this.varRefs.clear();
        this.unknownColorVars.clear();
        this.undefinedVars.clear();
        this.initialVarTypes.clear();
        this.changedTypeVars.clear();
        this.typeChangeSubscriptions.clear();
    }

    private isVarType(varName: string, typeNum: number) {
        return (
            this.varTypes.has(varName) &&
            (this.varTypes.get(varName) & typeNum) > 0
        );
    }

    addRulesForMatching(rules: CSSRuleList) {
        this.rulesQueue.push(rules);
    }

    matchVariablesAndDependants() {
        this.changedTypeVars.clear();
        this.initialVarTypes = new Map(this.varTypes);
        this.rulesQueue.forEach((rules) => this.collectVariables(rules));
        this.rulesQueue.forEach((rules) => this.collectVarDependants(rules));
        this.rulesQueue.splice(0);

        this.varRefs.forEach((refs, v) => {
            refs.forEach((r) => {
                if (this.varTypes.has(v)) {
                    this.resolveVariableType(r, this.varTypes.get(v));
                }
            });
        });

        this.unknownColorVars.forEach((v) => {
            if (!this.isVarType(v, VAR_TYPE_BGCOLOR | VAR_TYPE_TEXTCOLOR | VAR_TYPE_BORDERCOLOR)) {
                this.undefinedVars.add(v);
            }
        });

        this.changedTypeVars.forEach((varName) => {
            if (this.typeChangeSubscriptions.has(varName)) {
                this.typeChangeSubscriptions
                .get(varName)
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
                        modifiedValue = replaceCSSVariablesNames(
                            sourceValue,
                            (v) => varNameWrapper(v),
                            (fallback) => colorModifier(fallback, theme),
                        );
                    } else {
                        modifiedValue = colorModifier(sourceValue, theme);
                    }
                    declarations.push({
                        property,
                        value: modifiedValue,
                    });
                }

                addModifiedValue(VAR_TYPE_BGCOLOR, wrapBgColorVariableName, tryModifyBgColor);
                addModifiedValue(VAR_TYPE_TEXTCOLOR, wrapTextColorVariableName, tryModifyTextColor);
                addModifiedValue(VAR_TYPE_BORDERCOLOR, wrapBorderColorVariableName, tryModifyBorderColor);
                if (this.isVarType(varName, VAR_TYPE_BGIMG)) {
                    const property = wrapBgImgVariableName(varName);
                    let modifiedValue: string | Promise<string> = sourceValue;
                    if (isVarDependant(sourceValue)) {
                        modifiedValue = replaceCSSVariablesNames(
                            sourceValue,
                            (v) => wrapBgColorVariableName(v),
                            (fallback) => tryModifyBgColor(fallback, theme),
                        );
                    }
                    const bgModifier = getBgImageModifier(modifiedValue, rule, ignoredImgSelectors, isCancelled);
                    modifiedValue = typeof bgModifier === 'function' ? bgModifier(theme) : bgModifier;
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

    getModifierForVarDependant(property: string, sourceValue: string): (theme: Theme) => string {
        if (property === 'background-color') {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapBgColorVariableName(v),
                    (fallback) => tryModifyBgColor(fallback, theme),
                );
            };
        }
        if (property === 'color') {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapTextColorVariableName(v),
                    (fallback) => tryModifyTextColor(fallback, theme),
                );
            };
        }
        if (property === 'background' || property === 'background-image') {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => {
                        if (this.isVarType(v, VAR_TYPE_BGCOLOR)) {
                            return wrapBgColorVariableName(v);
                        }
                        if (this.isVarType(v, VAR_TYPE_BGIMG)) {
                            return wrapBgImgVariableName(v);
                        }
                        return v;
                    },
                    (fallback) => tryModifyBgColor(fallback, theme),
                );
            };
        }
        if (property === 'border-color' || property === 'border') {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => wrapBorderColorVariableName(v),
                    (fallback) => tryModifyTextColor(fallback, theme),
                );
            };
        }
        return null;
    }

    private subscribeForVarTypeChange(varName: string, callback: () => void) {
        if (!this.typeChangeSubscriptions.has(varName)) {
            this.typeChangeSubscriptions.set(varName, new Set());
        }
        this.typeChangeSubscriptions.get(varName).add(callback);
    }

    private unsubscribeFromVariableTypeChanges(varName: string, callback: () => void) {
        if (this.typeChangeSubscriptions.has(varName)) {
            this.typeChangeSubscriptions.get(varName).delete(callback);
        }
    }

    private collectVariables(rules: CSSRuleList) {
        iterateVariables(rules, (varName, value) => {
            if (this.definedVars.has(varName)) {
                return;
            }
            this.definedVars.add(varName);

            if (isVarDependant(value)) {
                return;
            }

            const color = tryParseColor(value);
            if (color) {
                this.unknownColorVars.add(varName);
            } else if (
                value.includes('url(') ||
                value.includes('linear-gradient(') ||
                value.includes('radial-gradient(')
            ) {
                this.resolveVariableType(varName, VAR_TYPE_BGIMG);
            }
        });
    }

    private resolveVariableType(varName: string, typeNum: number) {
        const initialType = this.initialVarTypes.get(varName) || 0;
        const currentType = this.varTypes.get(varName) || 0;
        const newType = currentType | typeNum;
        this.varTypes.set(varName, newType);
        if (newType !== initialType || this.undefinedVars.has(varName)) {
            this.changedTypeVars.add(varName);
            this.undefinedVars.delete(varName)
        }
    }

    private collectVarDependants(rules: CSSRuleList) {
        iterateVarDependants(rules, (property, value) => {
            if (property.startsWith('--')) {
                this.iterateVarDeps(value, (ref) => {
                    if (!this.varRefs.has(property)) {
                        this.varRefs.set(property, new Set());
                    }
                    this.varRefs.get(property).add(ref);
                });
            } else if (property === 'background-color') {
                this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_BGCOLOR));
            } else if (property === 'color') {
                this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_TEXTCOLOR));
            } else if (property === 'border-color' || property === 'border') {
                this.iterateVarDeps(value, (v) => this.resolveVariableType(v, VAR_TYPE_BORDERCOLOR));
            } else if (property === 'background' || property === 'background-image') {
                this.iterateVarDeps(value, (v) => {
                    if (this.isVarType(v, VAR_TYPE_BGCOLOR | VAR_TYPE_BGIMG)) {
                        return;
                    }
                    if (this.unknownColorVars.has(v)) {
                        this.resolveVariableType(v, VAR_TYPE_BGCOLOR);
                        return;
                    }
                });
            }
        });
    }

    private iterateVarDeps(
        value: string,
        iterator: (varDep: string) => void,
    ) {
        const varDeps = new Set<string>();
        iterateVarDependencies(value, (v) => varDeps.add(v));
        varDeps.forEach((v) => iterator(v));
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

function getVariableRange(input: string, searchStart = 0): Range {
    const start = input.indexOf('var(', searchStart);
    if (start >= 0) {
        const range = getParenthesesRange(input, start + 3);
        if (range) {
            return {start, end: range.end};
        }
        return null;
    }
}

function getVariablesMatches(input: string): VariableMatch[] {
    const ranges: VariableMatch[] = [];
    let i = 0;
    let range: Range;
    while ((range = getVariableRange(input, i))) {
        const {start, end} = range;
        ranges.push({start, end, value: input.substring(start, end)});
        i = range.end + 1;
    }
    return ranges;
}

function replaceVariablesMatches(input: string, replacer: (match: string) => string) {
    const matches = getVariablesMatches(input);
    const matchesCount = matches.length;
    if (matchesCount === 0) {
        return input;
    }

    const inputLength = input.length;
    const replacements = matches.map((m) => replacer(m.value));
    const parts: string[] = [];
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
        name = match.substring(4, match.length - 1);
        fallback = '';
    }
    return {name, fallback};
}

export function replaceCSSVariablesNames(
    value: string,
    nemeReplacer: (varName: string) => string,
    fallbackReplacer?: (fallbackValue: string) => string,
): string {
    const matchReplacer = (match: string) => {
        const {name, fallback} = getVariableNameAndFallback(match);
        const newName = nemeReplacer(name);
        if (!fallback) {
            return `var(${newName})`;
        }

        let newFallback: string;
        if (isVarDependant(fallback)) {
            newFallback = replaceCSSVariablesNames(fallback, nemeReplacer, fallbackReplacer);
        } else if (fallbackReplacer) {
            newFallback = fallbackReplacer(fallback);
        } else {
            newFallback = fallback;
        }
        return `var(${newName}, ${newFallback})`;
    };
    return replaceVariablesMatches(value, matchReplacer);
}

function iterateVariables(
    rules: CSSRuleList,
    iterator: (varName: string, varValue: string) => void,
) {
    iterateCSSRules(rules, (rule) => {
        rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
            if (property.startsWith('--')) {
                iterator(property, value);
            }
        });
    });
}

function iterateVarDependants(
    rules: CSSRuleList,
    iterator: (property: string, value: string) => void,
) {
    iterateCSSRules(rules, (rule) => {
        rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
            if (isVarDependant(value)) {
                iterator(property, value);
            }
        });
    });
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

function isVarDependant(value: string) {
    return value.includes('var(');
}

function tryModifyBgColor(color: string, theme: Theme) {
    const rgb = tryParseColor(color);
    return rgb ? modifyBackgroundColor(rgb, theme) : color;
}

function tryModifyTextColor(color: string, theme: Theme) {
    const rgb = tryParseColor(color);
    return rgb ? modifyForegroundColor(rgb, theme) : color;
}

function tryModifyBorderColor(color: string, theme: Theme) {
    const rgb = tryParseColor(color);
    return rgb ? modifyBorderColor(rgb, theme) : color;
}
