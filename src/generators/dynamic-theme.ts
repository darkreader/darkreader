import {formatSitesFixesConfig} from './utils/format';
import {parseSitesFixesConfig} from './utils/parse';
import {parseArray, formatArray} from '../utils/text';
import {compareURLPatterns, isURLInList} from '../utils/url';
import type {DynamicThemeFix} from '../definitions';

const dynamicThemeFixesCommands = {
    'INVERT': 'invert',
    'CSS': 'css',
    'IGNORE INLINE STYLE': 'ignoreInlineStyle',
    'IGNORE IMAGE ANALYSIS': 'ignoreImageAnalysis',
};

export function parseDynamicThemeFixes(text: string) {
    return parseSitesFixesConfig<DynamicThemeFix>(text, {
        commands: Object.keys(dynamicThemeFixesCommands),
        getCommandPropName: (command) => dynamicThemeFixesCommands[command],
        parseCommandValue: (command, value) => {
            if (command === 'CSS') {
                return value.trim();
            }
            return parseArray(value);
        },
    });
}

export function formatDynamicThemeFixes(dynamicThemeFixes: DynamicThemeFix[]) {
    const fixes = dynamicThemeFixes.slice().sort((a, b) => compareURLPatterns(a.url[0], b.url[0]));

    return formatSitesFixesConfig(fixes, {
        props: Object.values(dynamicThemeFixesCommands),
        getPropCommandName: (prop) => Object.entries(dynamicThemeFixesCommands).find(([, p]) => p === prop)[0],
        formatPropValue: (prop, value) => {
            if (prop === 'css') {
                return (value as string).trim().replace(/\n+/g, '\n');
            }
            return formatArray(value).trim();
        },
        shouldIgnoreProp: (prop, value) => {
            if (prop === 'css') {
                return !value;
            }
            return !(Array.isArray(value) && value.length > 0);
        },
    });
}

export function getDynamicThemeFixesFor(url: string, frameURL: string, fixes: DynamicThemeFix[], enabledForPDF: boolean) {
    if (fixes.length === 0 || fixes[0].url[0] !== '*') {
        return null;
    }

    const common = {
        url: fixes[0].url,
        invert: fixes[0].invert || [],
        css: fixes[0].css || [],
        ignoreInlineStyle: fixes[0].ignoreInlineStyle || [],
        ignoreImageAnalysis: fixes[0].ignoreImageAnalysis || [],
    };
    if (enabledForPDF) {
        common.invert = common.invert.concat('embed[type="application/pdf"]');
    }
    const sortedBySpecificity = fixes
        .slice(1)
        .map((theme) => {
            return {
                specificity: isURLInList(frameURL || url, theme.url) ? theme.url[0].length : 0,
                theme
            };
        })
        .filter(({specificity}) => specificity > 0)
        .sort((a, b) => b.specificity - a.specificity);

    if (sortedBySpecificity.length === 0) {
        return common;
    }

    const match = sortedBySpecificity[0].theme;

    return {
        url: match.url,
        invert: common.invert.concat(match.invert || []),
        css: [common.css, match.css].filter((s) => s).join('\n'),
        ignoreInlineStyle: common.ignoreInlineStyle.concat(match.ignoreInlineStyle || []),
        ignoreImageAnalysis: common.ignoreImageAnalysis.concat(match.ignoreImageAnalysis || []),
    };
}
