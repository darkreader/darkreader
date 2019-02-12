import {FilterConfig} from '../definitions'

export function createTextStyle(config: FilterConfig): string {
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

    if (config.textScale != 100) {
        lines.push(`  font-size: ${config.textScale}%;`);
    }

    lines.push('}');


    if(config.linkColor){
        lines.push('a:link{');
        lines.push(`  color: #${config.unclickedColor};`);
        lines.push('}');
        lines.push('a:visited{');
        lines.push(`  color: #${config.clickedColor};`);
        lines.push('}');
    }

    return lines.join('\n');
}
