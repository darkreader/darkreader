import type {FilterConfig} from '../definitions';

export function createTextStyle(config: FilterConfig): string {
    const lines: string[] = [];
    // Don't target pre elements as they are preformatted element's e.g. code blocks
    // Exclude font libraries to preserve icons
    lines.push('*:not(pre, .far, .fa, .glyphicon, [class*="vjs-"], .fab, .fa-github, .fas, .material-icons, .icofont, .typcn, mu, [class*="mu-"], .glyphicon, .icon) {');

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
