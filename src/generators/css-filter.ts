import {applyFilterToColor} from './utils/matrix';
import {createTextRule} from './text-style';
import {isUrlMatched} from '../utils/url';
import {FilterConfig, InversionFix, InversionFixes, SiteFix} from '../definitions';

export enum FilterMode {
    light = 0,
    dark = 1
}

export default function createCSSFilterStyleheet(config: FilterConfig, url: string, inversionFixes: InversionFixes) {
    const filterValue = getCSSFilterValue(config);
    const reverseFilterValue = 'invert(100%) hue-rotate(180deg)';
    return cssFilterStyleheetTemplate(filterValue, reverseFilterValue, config, url, inversionFixes);
}

export function cssFilterStyleheetTemplate(filterValue: string, reverseFilterValue: string, config: FilterConfig, url: string, inversionFixes: InversionFixes) {
    const fix = getInversionFixesFor(url, inversionFixes);

    const lines: string[] = [];

    lines.push('@media screen {');

    // Add leading rule
    if (filterValue) {
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
        lines.push(`* ${createTextRule(config)}`);
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

    const [r, g, b] = applyFilterToColor([255, 255, 255], config);
    const bgColor = {
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        toString() {
            return `rgb(${this.r},${this.g},${this.b})`;
        },
    };
    lines.push('');
    lines.push('/* Page background */');
    lines.push('html {');
    lines.push(`  background: ${bgColor} !important;`);
    lines.push('}');

    if (fix.rules && config.mode === FilterMode.dark) {
        lines.push('');
        lines.push('/* Custom rules */');
        lines.push(fix.rules.join('\n'));
    }

    lines.push('');
    lines.push('}');

    return lines.join('\n');
}

function getCSSFilterValue(config: FilterConfig) {
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
export function getInversionFixesFor(url: string, inversionFixes: InversionFixes): InversionFix {
    let found: SiteFix;
    if (url) {
        // Search for match with given URL
        const matches = inversionFixes.sites
            .filter((s) => isUrlMatched(url, s.url as string))
            .sort((a, b) => b.url.length - a.url.length);
        if (matches.length > 0) {
            console.log(`URL matches ${matches[0].url}`);
            return matches[0];
        }
    }
    return {...inversionFixes.common};
}

export function fillInversionFixesConfig($fixes: InversionFixes) {
    const common = {
        invert: toStringArray($fixes && $fixes.common && $fixes.common.invert),
        noinvert: toStringArray($fixes && $fixes.common && $fixes.common.noinvert),
        removebg: toStringArray($fixes && $fixes.common && $fixes.common.removebg),
        rules: toStringArray($fixes && $fixes.common && $fixes.common.rules),
    };
    const sites = ($fixes && Array.isArray($fixes.sites)
        ? $fixes.sites.filter((s) => isStringOrArray(s.url))
            .map((s) => {
                return {
                    url: s.url,
                    invert: common.invert.concat(toStringArray(s.invert)),
                    noinvert: common.noinvert.concat(toStringArray(s.noinvert)),
                    removebg: common.removebg.concat(toStringArray(s.removebg)),
                    rules: common.rules.concat(toStringArray(s.rules)),
                };
            })
        : [])
        .reduce((flat, s) => {
            if (Array.isArray(s.url)) {
                s.url.forEach((url) => {
                    flat.push({...s, ...{url}});
                });
            } else {
                flat.push(s);
            }
            return flat;
        }, []);
    return {common, sites};
}

function toStringArray(value: string | string[]): string[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === 'string' && value) {
        return [value];
    }
    return [];
}

function isStringOrArray(item) {
    return (typeof item === 'string' || Array.isArray(item));
}
