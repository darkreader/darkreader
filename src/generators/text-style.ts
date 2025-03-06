import type {Theme} from '../definitions';

// Exclude font libraries to preserve icons
const excludedSelectors = [
    'pre', 'pre *', 'code',
    '[aria-hidden="true"]',

    // Font Awesome
    '[class*="fa-"]',
    '.fa', '.fab', '.fad', '.fal', '.far', '.fas', '.fass', '.fasr', '.fat',

    // Generic matches for icon/symbol fonts
    '.icofont', '[style*="font-"]',
    '[class*="icon"]', '[class*="Icon"]',
    '[class*="symbol"]', '[class*="Symbol"]',

    // Glyph Icons
    '.glyphicon',

    // Material Design
    '[class*="material-symbol"]', '[class*="material-icon"]',

    // MUI
    'mu', '[class*="mu-"]',

    // Typicons
    '.typcn',

    // Videojs font
    '[class*="vjs-"]',
];

export function createTextStyle(config: Theme): string {
    const lines: string[] = [];
    lines.push(`*:not(${excludedSelectors.join(', ')}) {`);

    if (config.useFont && config.fontFamily) {
        lines.push(`  font-family: ${config.fontFamily} !important;`);
    }

    if (config.textStroke > 0) {
        lines.push(`  -webkit-text-stroke: ${config.textStroke}px !important;`);
        lines.push(`  text-stroke: ${config.textStroke}px !important;`);
    }

    lines.push('}');

    return lines.join('\n');
}
