import {formatSitesFixesConfig} from './utils/format';
import {parseSitesFixesConfig, getSitesFixesFor} from './utils/parse';
import type {SitePropsIndex} from './utils/parse';
import {parseArray, formatArray} from '../utils/text';
import {compareURLPatterns, isURLInList} from '../utils/url';
import type {DynamicThemeFix} from '../definitions';
import {isChromium} from '../utils/platform';

const dynamicThemeFixesCommands: { [key: string]: keyof DynamicThemeFix } = {
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
            return formatArray(value as string[]).trim();
        },
        shouldIgnoreProp: (prop, value) => {
            if (prop === 'css') {
                return !value;
            }
            return !(Array.isArray(value) && value.length > 0);
        },
    });
}

export function getDynamicThemeFixesFor(url: string, frameURL: string, text: string, index: SitePropsIndex<DynamicThemeFix>, enabledForPDF: boolean) {
    const fixes = getSitesFixesFor(frameURL || url, text, index, {
        commands: Object.keys(dynamicThemeFixesCommands),
        getCommandPropName: (command) => dynamicThemeFixesCommands[command],
        parseCommandValue: (command, value) => {
            if (command === 'CSS') {
                return value.trim();
            }
            return parseArray(value);
        },
    });

    if (fixes.length === 0 || fixes[0].url[0] !== '*') {
        return null;
    }
    const genericFix = fixes[0];

    const common = {
        url: genericFix.url,
        invert: genericFix.invert || [],
        css: genericFix.css || '',
        ignoreInlineStyle: genericFix.ignoreInlineStyle || [],
        ignoreImageAnalysis: genericFix.ignoreImageAnalysis || [],
    };
    if (enabledForPDF) {
        if (isChromium) {
            common.css += '\nembed[type="application/pdf"][src="about:blank"] { filter: invert(100%) contrast(90%); }';
        } else {
            common.css += '\nembed[type="application/pdf"] { filter: invert(100%) contrast(90%); }';
        }
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
