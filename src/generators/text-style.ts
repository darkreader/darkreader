import type {FilterConfig} from '../definitions';

export function createTextStyle(config: FilterConfig): string {
    // Don't target pre elements as they are preformatted element's e.g. code blocks
    // Exclude font libraries to preserve icons

    const exlcudingSelectors: string = [
        'pre, pre *, code, .glyphicon, [class*="vjs-"], .icofont, .typcn, mu, [class*="mu-"], .glyphicon, .icon',

        // Font Awesome
        '.fab, .fa-github, .fas',

        // Material Icons
        '.material',

        // GitHub
        '.blob-code-inner, .blob-code-inner *',

        // Gitlab
        '.monaco-editor',
    ].join(', ');

    const lines: string[] = [];
    lines.push(`*:not(${ mono }) {`);

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
