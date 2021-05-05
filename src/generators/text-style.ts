import type {FilterConfig} from '../definitions';

export function createTextStyle(config: FilterConfig): string {
    const lines: string[] = [];
    // Don't target pre elements as they are preformatted element's e.g. code blocks
    // Exclude font libraries to preserve icons
    lines.push('*:not(pre, .far, .fa, .glyphicon, .vjs-icon-play, .vjs-icon-pause, .vjs-icon-volume-mute, .vjs-icon-volume-low, .vjs-icon-volume-mid, .vjs-icon-volume-mid, .vjs-icon-volume-mid, .vjs-icon-volume-high, .vjs-icon-fullscreen-enter, .vjs-icon-fullscreen-exit, .vjs-icon-square, .vjs-icon-spinner, .vjs-icon-subtitles, .vjs-icon-captions, .vjs-icon-chapters, .vjs-icon-share, .vjs-icon-cog, .vjs-icon-circle, .vjs-icon-circle-outline, .vjs-icon-circle-inner-circle) {');

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
