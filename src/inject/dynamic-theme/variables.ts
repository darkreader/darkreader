import {modifyBackgroundColor, modifyBorderColor, modifyForegroundColor, modifyGradientColor, modifyShadowColor} from '../../generators/modify-colors';
import {getParenthesesRange} from '../../utils/text';
import {iterateCSSRules, iterateCSSDeclarations} from './css-rules';
import {tryParseColor} from './modify-css';
import type {Theme} from '../../definitions';

export type CSSVariableModifier = (theme: Theme) => Array<{property: string; value: string}>;

type Range = [number, number];

interface VariableMatch {
    value: string;
    start: number;
    end: number;
}

function getVariableRange(input: string, searchStart = 0): Range {
    const start = input.indexOf('var(', searchStart);
    if (start >= 0) {
        const [, end] = getParenthesesRange(input, start + 3);
        return [start, end];
    }
    return null;
}

function getVariablesMatches(input: string): VariableMatch[] {
    const ranges: VariableMatch[] = [];
    let i = 0;
    let range: Range;
    while ((range = getVariableRange(input, i))) {
        const [start, end] = range;
        ranges.push({start, end, value: input.substring(start, end)});
        i = range[1] + 1;
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
    let parts: string[] = [];
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
    iterator: (varName: string, varValue: string, rule: CSSStyleRule) => void,
) {
    iterateCSSRules(rules, (rule) => {
        rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
            if (property.startsWith('--')) {
                iterator(property, value, rule);
            }
        });
    });
}

function iterateVarDependants(
    rules: CSSRuleList,
    iterator: (property: string, value: string, rule: CSSStyleRule) => void,
) {
    iterateCSSRules(rules, (rule) => {
        rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
            if (isVarDependant(value)) {
                iterator(property, value, rule);
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

class VariablesStore {
    private definedVars: Set<string>;
    private varRefs: Map<string, Set<string>>;
    private colorVars: Set<string>;
    private bgColorVars: Set<string>;
    private textColorVars: Set<string>;
    private borderColorVars: Set<string>;
    private bgImgVars: Set<string>;

    private unknownBgVars: Set<string>;

    private rulesQueue: CSSRuleList[];

    constructor() {
        this.reset();
    }

    reset() {
        this.definedVars = new Set();
        this.varRefs = new Map();
        this.colorVars = new Set();
        this.bgColorVars = new Set();
        this.textColorVars = new Set();
        this.borderColorVars = new Set();
        this.bgImgVars = new Set();
        this.unknownBgVars = new Set();
        this.rulesQueue = [];
    }

    addRulesForMatching(rules: CSSRuleList) {
        this.rulesQueue.push(rules);
    }

    matchVariablesAndDependants() {
        this.rulesQueue.forEach((rules) => this.collectVariables(rules));
        this.rulesQueue.forEach((rules) => this.collectVarDependants(rules));
        this.rulesQueue.splice(0);
        this.varRefs.forEach((refs, v) => {
            refs.forEach((r) => {
                if (this.bgColorVars.has(v)) {
                    this.bgColorVars.add(r);
                }
                if (this.textColorVars.has(v)) {
                    this.textColorVars.add(r);
                }
                if (this.borderColorVars.has(v)) {
                    this.borderColorVars.add(r);
                }
                if (this.bgImgVars.has(v)) {
                    this.bgImgVars.add(r);
                }
            });
        });
    }

    getModifierForVariable(varName: string, sourceValue: string): CSSVariableModifier {
        return (theme) => {
            const modifiedVars: ReturnType<CSSVariableModifier> = [];

            function addModifiedValue(
                typeSet: Set<string>,
                varNameWrapper: (name: string) => string,
                colorModifier: (c: string, t: Theme) => string,
            ) {
                if (!typeSet.has(varName)) {
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
                modifiedVars.push({
                    property,
                    value: modifiedValue,
                });
            }

            addModifiedValue(this.bgColorVars, wrapBgColorVariableName, tryModifyBgColor);
            addModifiedValue(this.textColorVars, wrapTextColorVariableName, tryModifyTextColor);
            addModifiedValue(this.borderColorVars, wrapBorderColorVariableName, tryModifyBorderColor);
            return modifiedVars;
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
        if (property === 'background') {
            return (theme) => {
                return replaceCSSVariablesNames(
                    sourceValue,
                    (v) => {
                        if (this.bgColorVars.has(v)) {
                            return wrapBgColorVariableName(v);
                        }
                        if (this.bgImgVars.has(v)) {
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

    private collectVariables(rules: CSSRuleList) {
        iterateVariables(rules, (varName, value, rule) => {
            if (this.definedVars.has(varName)) {
                return;
            }
            this.definedVars.add(varName);

            if (isVarDependant(value)) {
                return;
            }

            const color = tryParseColor(value);
            if (color) {
                this.colorVars.add(varName);
            } else if (value.startsWith('url(')) {
                this.bgImgVars.add(varName);
            }
        });
    }

    private collectVarDependants(rules: CSSRuleList) {
        iterateVarDependants(rules, (property, value, rule) => {
            if (property.startsWith('--')) {
                this.iterateVarDeps(value, (ref) => {
                    if (!this.varRefs.has(property)) {
                        this.varRefs.set(property, new Set());
                    }
                    this.varRefs.get(property).add(ref);
                });
            } else if (property === 'background-color') {
                this.iterateVarDeps(value, (v) => this.bgColorVars.add(v));
            } else if (property === 'color') {
                this.iterateVarDeps(value, (v) => this.textColorVars.add(v));
            } else if (property === 'border-color' || property === 'border') {
                this.iterateVarDeps(value, (v) => this.borderColorVars.add(v));
            } else if (property === 'background') {
                this.iterateVarDeps(value, (v) => {
                    if (this.bgImgVars.has(v) || this.bgColorVars.has(v)) {
                        return;
                    }
                    if (this.colorVars.has(v)) {
                        this.bgColorVars.add(v);
                        return;
                    }
                    this.unknownBgVars.add(v);
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
