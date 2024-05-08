import type {Theme} from '../definitions';

export function createTextStyle(config: Theme): string {
    const lines: string[] = [];
    // Don't target pre elements as they are preformatted element's e.g. code blocks
    // Exclude font libraries to preserve icons
    lines.push('*:not(pre, pre *, code, [class*="icon"], [class*="Icon"], [class*="symbol"], [class*="Symbol"], [aria-hidden="true"], .far, .fa, [class*="fa-"] .glyphicon, [class*="vjs-"], .fab, .fas, .icon-asset, [class*="material-symbol"], [style*="font-"], .material-icons, .icofont, .typcn, mu, [class*="mu-"], .glyphicon) {');

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
