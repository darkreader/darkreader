import {applyFilterToColor, getInversionFixesFor, createFilterMatrix, Matrix} from './utils';
import {FilterMode} from './css-filter';
import {FilterConfig, InversionFix, InversionFixes} from '../definitions';

export function createSVGFilterStylesheet(config: FilterConfig, url: string, inversionFixes: InversionFixes) {
    const fix = getInversionFixesFor(url, inversionFixes);

    const lines: string[] = [];

    lines.push('@media screen {');

    // Add leading rule
    lines.push('');
    lines.push('/* Leading rule */');
    lines.push(createLeadingRule());

    if (config.mode === FilterMode.dark) {
        // Add reverse rule
        lines.push('');
        lines.push('/* Reverse rule */');
        lines.push(createReverseRule(fix));
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

function createLeadingRule(): string {
    return [
        'html {',
        `  -webkit-filter: url(#dark-reader-filter) !important;`,
        `  filter: url(#dark-reader-filter) !important;`,
        '}'
    ].join('\n');
}

function joinSelectors(selectors: string[]) {
    return selectors.map((s) => s.replace(/\,$/, '')).join(',\n');
}

function createReverseRule(fix: InversionFix): string {
    const lines: string[] = [];

    if (fix.invert.length > 0) {
        lines.push(`${joinSelectors(fix.invert)} {`);
        lines.push('  -webkit-filter: url(#dark-reader-reverse-filter) !important;');
        lines.push('  filter: url(#dark-reader-reverse-filter) !important;');
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

export function getSVGFilterMatrixValue(config: FilterConfig) {
    const matrix = createFilterMatrix(config);
    return matrix.slice(0, 4).map(m => m.map(m => m.toFixed(3)).join(' ')).join('\n');
}

export function getSVGReverseFilterMatrixValue() {
    return Matrix.invertNHue().slice(0, 4).map(m => m.map(m => m.toFixed(3)).join(' ')).join('\n');
}
