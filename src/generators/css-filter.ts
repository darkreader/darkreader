import {formatSitesFixesConfig} from './utils/format';
import {applyColorMatrix, createFilterMatrix} from './utils/matrix';
import {parseSitesFixesConfig} from './utils/parse';
import {parseArray, formatArray} from '../utils/text';
import {compareURLPatterns, isURLInList} from '../utils/url';
import {createTextStyle} from './text-style';
import type {FilterConfig, InversionFix} from '../definitions';
import {compareChromeVersions, chromiumVersion, isChromium} from '../utils/platform';

export enum FilterMode {
    light = 0,
    dark = 1
}

/**
 * This checks if the current chromium version has the patch in it.
 * As of Chromium v81.0.4035.0 this has been the situation
 *
 * Bug report: https://bugs.chromium.org/p/chromium/issues/detail?id=501582
 * Patch: https://chromium-review.googlesource.com/c/chromium/src/+/1979258
 */
export function hasPatchForChromiumIssue501582() {
    return Boolean(
        isChromium &&
        compareChromeVersions(chromiumVersion, '81.0.4035.0') >= 0
    );
}

export default function createCSSFilterStyleSheet(config: FilterConfig, url: string, frameURL: string, inversionFixes: InversionFix[]) {
    const filterValue = getCSSFilterValue(config);
    const reverseFilterValue = 'invert(100%) hue-rotate(180deg)';
    return cssFilterStyleSheetTemplate(filterValue, reverseFilterValue, config, url, frameURL, inversionFixes);
}

export function cssFilterStyleSheetTemplate(filterValue: string, reverseFilterValue: string, config: FilterConfig, url: string, frameURL: string, inversionFixes: InversionFix[]) {
    const fix = getInversionFixesFor(frameURL || url, inversionFixes);

    const lines: string[] = [];

    lines.push('@media screen {');

    // Add leading rule
    if (filterValue && !frameURL) {
        lines.push('');
        lines.push('/* Leading rule */');
        lines.push(createLeadingRule(filterValue));
    }

    if (config.mode === FilterMode.dark) {
        // Add reverse rule
        lines.push('');
        lines.push('/* Reverse rule */');
        lines.push(createReverseRule(reverseFilterValue, fix));
    }

    if (config.useFont || config.textStroke > 0) {
        // Add text rule
        lines.push('');
        lines.push('/* Font */');
        lines.push(createTextStyle(config));
    }

    // Fix bad font hinting after inversion
    lines.push('');
    lines.push('/* Text contrast */');
    lines.push('html {');
    lines.push('  text-shadow: 0 0 0 !important;');
    lines.push('}');

    // Full screen fix
    lines.push('');
    lines.push('/* Full screen */');
    [':-webkit-full-screen', ':-moz-full-screen', ':fullscreen'].forEach((fullScreen) => {
        lines.push(`${fullScreen}, ${fullScreen} * {`);
        lines.push('  -webkit-filter: none !important;');
        lines.push('  filter: none !important;');
        lines.push('}');
    });

    if (!frameURL) {
        const light = [255, 255, 255];
        // If browser affected by Chromium Issue 501582, set dark background on html
        const bgColor = !hasPatchForChromiumIssue501582() && config.mode === FilterMode.dark ?
            applyColorMatrix(light, createFilterMatrix(config)).map(Math.round) :
            light;
        lines.push('');
        lines.push('/* Page background */');
        lines.push('html {');
        lines.push(`  background: rgb(${bgColor.join(',')}) !important;`);
        lines.push('}');
    }

    if (fix.css && fix.css.length > 0 && config.mode === FilterMode.dark) {
        lines.push('');
        lines.push('/* Custom rules */');
        lines.push(fix.css);
    }

    lines.push('');
    lines.push('}');

    return lines.join('\n');
}

export function getCSSFilterValue(config: FilterConfig) {
    const filters: string[] = [];

    if (config.mode === FilterMode.dark) {
        filters.push('invert(100%) hue-rotate(180deg)');
    }
    if (config.brightness !== 100) {
        filters.push(`brightness(${config.brightness}%)`);
    }
    if (config.contrast !== 100) {
        filters.push(`contrast(${config.contrast}%)`);
    }
    if (config.grayscale !== 0) {
        filters.push(`grayscale(${config.grayscale}%)`);
    }
    if (config.sepia !== 0) {
        filters.push(`sepia(${config.sepia}%)`);
    }

    if (filters.length === 0) {
        return null;
    }

    return filters.join(' ');
}

function createLeadingRule(filterValue: string): string {
    return [
        'html {',
        `  -webkit-filter: ${filterValue} !important;`,
        `  filter: ${filterValue} !important;`,
        '}'
    ].join('\n');
}

function joinSelectors(selectors: string[]) {
    return selectors.map((s) => s.replace(/\,$/, '')).join(',\n');
}

function createReverseRule(reverseFilterValue: string, fix: InversionFix): string {
    const lines: string[] = [];

    if (fix.invert.length > 0) {
        lines.push(`${joinSelectors(fix.invert)} {`);
        lines.push(`  -webkit-filter: ${reverseFilterValue} !important;`);
        lines.push(`  filter: ${reverseFilterValue} !important;`);
        lines.push('}');
    }

    if (fix.noinvert.length > 0) {
        lines.push(`${joinSelectors(fix.noinvert)} {`);
        lines.push('  -webkit-filter: none !important;');
        lines.push('  filter: none !important;');
        lines.push('}');
    }

    if (fix.removebg.length > 0) {
        lines.push(`${joinSelectors(fix.removebg)} {`);
        lines.push('  background: white !important;');
        lines.push('}');
    }

    return lines.join('\n');
}

/**
* Returns fixes for a given URL.
* If no matches found, common fixes will be returned.
* @param url Site URL.
* @param inversionFixes List of inversion fixes.
*/
export function getInversionFixesFor(url: string, inversionFixes: InversionFix[]): InversionFix {
    const common = {
        url: inversionFixes[0].url,
        invert: inversionFixes[0].invert || [],
        noinvert: inversionFixes[0].noinvert || [],
        removebg: inversionFixes[0].removebg || [],
        css: inversionFixes[0].css || '',
    };

    if (url) {
        // Search for match with given URL
        const matches = inversionFixes
            .slice(1)
            .filter((s) => isURLInList(url, s.url))
            .sort((a, b) => b.url[0].length - a.url[0].length);
        if (matches.length > 0) {
            const found = matches[0];
            return {
                url: found.url,
                invert: common.invert.concat(found.invert || []),
                noinvert: common.noinvert.concat(found.noinvert || []),
                removebg: common.removebg.concat(found.removebg || []),
                css: [common.css, found.css].filter((s) => s).join('\n'),
            };
        }
    }
    return common;
}

const inversionFixesCommands = {
    'INVERT': 'invert',
    'NO INVERT': 'noinvert',
    'REMOVE BG': 'removebg',
    'CSS': 'css',
};

export function parseInversionFixes(text: string) {
    return parseSitesFixesConfig<InversionFix>(text, {
        commands: Object.keys(inversionFixesCommands),
        getCommandPropName: (command) => inversionFixesCommands[command],
        parseCommandValue: (command, value) => {
            if (command === 'CSS') {
                return value.trim();
            }
            return parseArray(value);
        },
    });
}

export function formatInversionFixes(inversionFixes: InversionFix[]) {
    const fixes = inversionFixes.slice().sort((a, b) => compareURLPatterns(a.url[0], b.url[0]));

    return formatSitesFixesConfig(fixes, {
        props: Object.values(inversionFixesCommands),
        getPropCommandName: (prop) => Object.entries(inversionFixesCommands).find(([, p]) => p === prop)[0],
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
        }
    });
}
