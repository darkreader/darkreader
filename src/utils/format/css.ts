import {parseCSS} from '../parse/css';
import type {ParsedAtRule, ParsedDeclaration, ParsedStyleRule} from '../parse/css';

export function formatCSS(cssText: string): string {
    const parsed = parseCSS(cssText);

    const lines: string[] = [];
    const tab = '    ';

    function formatRule(rule: ParsedAtRule | ParsedStyleRule, indent: string) {
        if (isStyleRule(rule)) {
            formatStyleRule(rule as ParsedStyleRule, indent);
        } else {
            formatAtRule(rule, indent);
        }
    }

    function formatAtRule({type, query, rules}: ParsedAtRule, indent: string) {
        lines.push(`${indent}${type} ${query} {`);
        rules.forEach((child) => formatRule(child, `${indent}${tab}`));
        lines.push(`${indent}}`);
    }

    function formatStyleRule({selectors, declarations}: ParsedStyleRule, indent: string) {
        const lastSelectorIndex = selectors.length - 1;
        selectors.forEach((selector, i) => {
            lines.push(`${indent}${selector}${i < lastSelectorIndex ? ',' : ' {'}`);
        });
        const sorted = sortDeclarations(declarations);
        sorted.forEach(({property, value, important}) => {
            lines.push(`${indent}${tab}${property}: ${value}${important ? ' !important' : ''};`);
        });
        lines.push(`${indent}}`);
    }

    clearEmptyRules(parsed);
    parsed.forEach((rule) => formatRule(rule, ''));
    return lines.join('\n');
}

function sortDeclarations(declarations: ParsedDeclaration[]) {
    const prefixRegex = /^-[a-z]-/;
    return [...declarations].sort((a, b) => {
        const aProp = a.property;
        const bProp = b.property;
        const aPrefix = aProp.match(prefixRegex)?.[0] ?? '';
        const bPrefix = bProp.match(prefixRegex)?.[0] ?? '';
        const aNorm = aPrefix ? aProp.replace(prefixRegex, '') : aProp;
        const bNorm = bPrefix ? bProp.replace(prefixRegex, '') : bProp;
        if (aNorm === bNorm) {
            return aPrefix.localeCompare(bPrefix);
        }
        return aNorm.localeCompare(bNorm);
    });
}

function isStyleRule(rule: ParsedAtRule | ParsedStyleRule): rule is ParsedStyleRule {
    return 'selectors' in rule;
}

function clearEmptyRules(rules: Array<ParsedAtRule | ParsedStyleRule>) {
    for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (isStyleRule(rule)) {
            if (rule.declarations.length === 0) {
                rules.splice(i, 1);
            }
        } else {
            clearEmptyRules(rule.rules);
            if (rule.rules.length === 0) {
                rules.splice(i, 1);
            }
        }
    }
}
