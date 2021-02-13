import type {FilterConfig} from '../definitions';

export function createTextStyle(config: FilterConfig): string {
    const lines: string[] = [];
    // Don't target pre elements as they are preformatted element's e.g. code blocks
    lines.push('*:not(pre) {');

    if (config.useFont && config.fontFamily) {
        // TODO: Validate...
        lines.push(`  font-family: ${config.fontFamily} !important;`);
    }

    if (config.textStroke > 0) {
        lines.push(`  -webkit-text-stroke: ${config.textStroke}px !important;`);
        lines.push(`  text-stroke: ${config.textStroke}px !important;`);
    }

    lines.push('}');

    if (config.boldTextBrightness) {
        lines.push('b {');
        lines.push(`  -webkit-text-stroke: 0.4px !important;`);
        lines.push(`  text-stroke: 0.4px !important;`);
        lines.push('}');
    }

    return lines.join('\n');
}
