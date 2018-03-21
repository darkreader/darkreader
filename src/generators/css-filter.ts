import {applyFilterToColor} from './utils';
import {isUrlMatched} from '../background/utils'
import {FilterConfig, InversionFix, InversionFixes, SiteFix} from '../definitions';

export enum FilterMode {
    light = 0,
    dark = 1
}

export default function createCSSFilterStyle(config: FilterConfig, url: string, inversionFixes: InversionFixes) {
    const fix = getFixesFor(url, inversionFixes);

    const lines: string[] = [];

    lines.push('@media screen {');

    // Add leading rule
    lines.push('');
    lines.push('/* Leading rule */');
    lines.push(createLeadingRule(config));

    if (config.mode === FilterMode.dark) {
        // Add contrary rule
        lines.push('');
        lines.push('/* Contrary rule */');
        lines.push(createContraryRule(config, fix));
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

    const [r, g, b] = applyFilterToColor([0, 0, 0], config);
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

function createLeadingRule(config: FilterConfig): string {
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
        return '';
    }

    return [
        'html {',
        `  -webkit-filter: ${filters.join(' ')} !important;`,
        `  filter: ${filters.join(' ')} !important;`,
        '}'
    ].join('\n');
}

function joinSelectors(selectors: string[]) {
    return selectors.map((s) => s.replace(/\,$/, '')).join(',\n');
}

function createContraryRule(config: FilterConfig, fix: InversionFix): string {
    const lines: string[] = [];

    if (fix.invert.length > 0) {
        lines.push(`${joinSelectors(fix.invert)} {`);
        lines.push('  -webkit-filter: invert(100%) hue-rotate(180deg) !important;');
        lines.push('  filter: invert(100%) hue-rotate(180deg) !important;');
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

function createTextRule(config: FilterConfig): string {
    const lines: string[] = [];
    lines.push('* {');

    if (config.useFont && config.fontFamily) {
        // TODO: Validate...
        lines.push(`  font-family: ${config.fontFamily} !important;`);
    }

    if (config.textStroke > 0) {
        lines.push(`  -webkit-text-stroke: ${config.textStroke}px !important;`);
        lines.push(`  text-stroke: ${config.textStroke}px !important;`);
    }

    lines.push('}');

    return lines.join('\n');
}

/**
* Returns fixes for a given URL.
* If no matches found, common fixes will be returned.
* @param url Site URL.
* @param inversionFixes List of inversion fixes.
*/
function getFixesFor(url: string, inversionFixes: InversionFixes): InversionFix {
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
