import {multiplyMatrices} from './utils';
import {FilterConfig, InversionFix} from '../definitions';

export enum FilterMode {
    light = 0,
    dark = 1
}

export default function createCSSFilterStyle(config: FilterConfig, fix: InversionFix) {
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

    //
    // Interpolate background color (fastest, no script required).
    // http://www.w3.org/TR/filter-effects/#brightnessEquivalent

    // Brightness
    let value = config.mode === FilterMode.dark ? 0 : 1;
    value = value * (config.brightness) / 100;

    // Contrast
    value = value * (config.contrast) / 100 - (0.5 * config.contrast / 100) + 0.5;

    // Sepia
    const rgbaMatrix = [[value], [value], [value], [1]];
    const sepia = config.sepia / 100;
    const sepiaMatrix = [
        [(0.393 + 0.607 * (1 - sepia)), (0.769 - 0.769 * (1 - sepia)), (0.189 - 0.189 * (1 - sepia)), 0],
        [(0.349 - 0.349 * (1 - sepia)), (0.686 + 0.314 * (1 - sepia)), (0.168 - 0.168 * (1 - sepia)), 0],
        [(0.272 - 0.272 * (1 - sepia)), (0.534 - 0.534 * (1 - sepia)), (0.131 + 0.869 * (1 - sepia)), 0],
        [0, 0, 0, 1],
    ];
    const resultMatrix = multiplyMatrices(sepiaMatrix, rgbaMatrix);
    let r = resultMatrix[0][0], g = resultMatrix[1][0], b = resultMatrix[2][0];

    // Result color
    if (r > 1) r = 1; if (r < 0) r = 0;
    if (g > 1) g = 1; if (g < 0) g = 0;
    if (b > 1) b = 1; if (b < 0) b = 0;
    const color = {
        r: Math.round(255 * r),
        g: Math.round(255 * g),
        b: Math.round(255 * b),
        toString() {
            return `rgb(${this.r},${this.g},${this.b})`;
        },
    };
    lines.push('');
    lines.push('/* Page background */');
    lines.push('html {');
    lines.push(`  background: ${color} !important;`);
    lines.push('}');

    if (fix.rules && config.mode === FilterMode.dark) {
        lines.push('');
        lines.push('/* Custom rules */');
        lines.push(fix.rules.join('\\n'));
    }

    lines.push('');
    lines.push('}');

    return lines.join('\\n');
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
    ].join('\\n');
}

function joinSelectors(selectors: string[]) {
    return selectors.map((s) => s.replace(/\,$/, '')).join(',\\n');
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

    return lines.join('\\n');
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

    return lines.join('\\n');
}
