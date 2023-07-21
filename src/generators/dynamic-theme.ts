import {formatSitesFixesConfig} from './utils/format';
import {parseSitesFixesConfig, getSitesFixesFor, getDomain} from './utils/parse';
import type {SitePropsIndex} from './utils/parse';
import {parseArray, formatArray} from '../utils/text';
import {compareURLPatterns} from '../utils/url';
import type {DynamicThemeFix} from '../definitions';

declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;

const dynamicThemeFixesCommands: { [key: string]: keyof DynamicThemeFix } = {
    'INVERT': 'invert',
    'CSS': 'css',
    'IGNORE INLINE STYLE': 'ignoreInlineStyle',
    'IGNORE IMAGE ANALYSIS': 'ignoreImageAnalysis',
};

export function parseDynamicThemeFixes(text: string): DynamicThemeFix[] {
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

export function formatDynamicThemeFixes(dynamicThemeFixes: DynamicThemeFix[]): string {
    const fixes = dynamicThemeFixes.slice().sort((a, b) => compareURLPatterns(a.url[0], b.url[0]));

    return formatSitesFixesConfig(fixes, {
        props: Object.values(dynamicThemeFixesCommands),
        getPropCommandName: (prop) => Object.entries(dynamicThemeFixesCommands).find(([, p]) => p === prop)![0],
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

export function getDynamicThemeFixesFor(url: string, isTopFrame: boolean, text: string, index: SitePropsIndex<DynamicThemeFix>, enabledForPDF: boolean): DynamicThemeFix[] | null {
    const fixes = getSitesFixesFor(url, text, index, {
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

    if (enabledForPDF) {
        // Copy part of fixes which will be mutated
        const fixes_: DynamicThemeFix[] = [...fixes];
        fixes_[0] = {...fixes_[0]};
        if (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) {
            fixes_[0].css += '\nembed[type="application/pdf"][src="about:blank"] { filter: invert(100%) contrast(90%); }';
        } else {
            fixes_[0].css += '\nembed[type="application/pdf"] { filter: invert(100%) contrast(90%); }';
        }
        if (['drive.google.com', 'mail.google.com'].includes(getDomain(url))) {
            fixes_[0].invert.push('div[role="dialog"] div[role="document"]');
        }
        return fixes_;
    }

    return fixes;
}
