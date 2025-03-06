import {getOpenCloseRange, splitExcluding} from '../text';
import type {TextRange} from '../text';

import {removeCSSComments} from './css-text';

export interface ParsedDeclaration {
    property: string;
    value: string;
    important: boolean;
}

export interface ParsedStyleRule {
    selectors: string[];
    declarations: ParsedDeclaration[];
}

export interface ParsedAtRule {
    type: string;
    query: string;
    rules: Array<ParsedAtRule | ParsedStyleRule>;
}

export type ParsedCSS = Array<ParsedAtRule | ParsedStyleRule>;

export function parseCSS(cssText: string): ParsedCSS {
    cssText = removeCSSComments(cssText);
    cssText = cssText.trim();
    if (!cssText) {
        return [];
    }

    const rules: ParsedCSS = [];

    // Find {...} ranges excluding inside of "...", [...] etc.
    const excludeRanges = getTokenExclusionRanges(cssText);
    const bracketRanges = getAllOpenCloseRanges(cssText, '{', '}', excludeRanges);

    let ruleStart = 0;
    bracketRanges.forEach((brackets) => {
        const key = cssText.substring(ruleStart, brackets.start).trim();
        const content = cssText.substring(brackets.start + 1, brackets.end - 1);

        if (key.startsWith('@')) {
            const typeEndIndex = key.search(/[\s\(]/);
            const rule: ParsedAtRule = {
                type: typeEndIndex < 0 ? key : key.substring(0, typeEndIndex),
                query: typeEndIndex < 0 ? '' : key.substring(typeEndIndex).trim(),
                rules: parseCSS(content),
            };
            rules.push(rule);
        } else {
            const rule: ParsedStyleRule = {
                selectors: parseSelectors(key),
                declarations: parseDeclarations(content),
            };
            rules.push(rule);
        }

        ruleStart = brackets.end;
    });

    return rules;
}

function getAllOpenCloseRanges(
    input: string,
    openToken: string,
    closeToken: string,
    excludeRanges: TextRange[] = [],
) {
    const ranges: TextRange[] = [];
    let i = 0;
    let range: TextRange | null;
    while ((range = getOpenCloseRange(input, i, openToken, closeToken, excludeRanges))) {
        ranges.push(range);
        i = range.end;
    }
    return ranges;
}

function getTokenExclusionRanges(cssText: string) {
    const singleQuoteGoesFirst = cssText.indexOf("'") < cssText.indexOf('"');
    const firstQuote = singleQuoteGoesFirst ? "'" : '"';
    const secondQuote = singleQuoteGoesFirst ? '"' : "'";
    const excludeRanges: TextRange[] = getAllOpenCloseRanges(cssText, firstQuote, firstQuote);
    excludeRanges.push(...getAllOpenCloseRanges(cssText, secondQuote, secondQuote, excludeRanges));
    excludeRanges.push(...getAllOpenCloseRanges(cssText, '[', ']', excludeRanges));
    excludeRanges.push(...getAllOpenCloseRanges(cssText, '(', ')', excludeRanges));
    return excludeRanges;
}

function parseSelectors(selectorText: string) {
    const excludeRanges = getTokenExclusionRanges(selectorText);
    return splitExcluding(selectorText, ',', excludeRanges);
}

function parseDeclarations(cssDeclarationsText: string) {
    const declarations: ParsedDeclaration[] = [];
    const excludeRanges = getTokenExclusionRanges(cssDeclarationsText);
    splitExcluding(cssDeclarationsText, ';', excludeRanges).forEach((part) => {
        const colonIndex = part.indexOf(':');
        if (colonIndex > 0) {
            const importantIndex = part.indexOf('!important');
            declarations.push({
                property: part.substring(0, colonIndex).trim(),
                value: part.substring(colonIndex + 1, importantIndex > 0 ? importantIndex : part.length).trim(),
                important: importantIndex > 0,
            });
        }
    });
    return declarations;
}

export function isParsedStyleRule(rule: ParsedAtRule | ParsedStyleRule): rule is ParsedStyleRule {
    return 'selectors' in rule;
}
