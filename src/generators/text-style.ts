import type {Theme} from '../definitions';

export function createTextStyle(theme: Theme): string {
    const lines: string[] = [];
    // Don't target pre elements as they are preformatted element's e.g. code blocks
    lines.push('*:not(pre) {');

    if (theme.useFont && theme.fontFamily) {
        // TODO: Validate...
        lines.push(`  font-family: ${theme.fontFamily} !important;`);
    }

    if (theme.textStroke > 0) {
        lines.push(`  -webkit-text-stroke: ${theme.textStroke}px !important;`);
        lines.push(`  text-stroke: ${theme.textStroke}px !important;`);
    }

    lines.push('}');

    return lines.join('\n');
}
