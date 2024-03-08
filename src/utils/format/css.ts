import {parseCSS} from '../parse/css';
import type {ParsedAtRule, ParsedStyleRule} from '../parse/css';

export function formatCSS(cssText: string): string {
    const parsed = parseCSS(cssText);

    const lines: string[] = [];
    const tab = '    ';

    function isStyleRule(rule: ParsedAtRule | ParsedStyleRule): rule is ParsedStyleRule {
        return 'selectors' in rule;
    }

    function clearEmpty(rules: Array<ParsedAtRule | ParsedStyleRule>) {
        for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i];
            if (isStyleRule(rule)) {
                if (rule.declarations.length === 0) {
                    rules.splice(i, 1);
                }
            } else {
                clearEmpty(rule.rules);
                if (rule.rules.length === 0) {
                    rules.splice(i, 1);
                }
            }
        }
    }

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
        declarations.forEach(({property, value, important}) => {
            lines.push(`${indent}${tab}${property}: ${value}${important ? ' !important' : ''};`);
        });
        lines.push(`${indent}}`);
    }

    clearEmpty(parsed);
    parsed.forEach((rule) => formatRule(rule, ''));
    return lines.join('\n');
}
