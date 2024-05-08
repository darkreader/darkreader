import type {Theme} from '../definitions';

export function createTextStyle(config: Theme): string {
    // Blacklist for common code elements and icon/symbol fonts
    const blacklistedSelectors = [ 
      // common html code elements
      'pre', 'pre *', 'code',
      // generic matches for icon/symbol fonts
      '.icofont', '[style*="font-"]',
      '[class*="icon"]', '[class*="Icon"]',
      '[class*="symbol"]', '[class*="Symbol"]',
      // see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-hidden#description
      '[aria-hidden="true"]', 
      // vendor: font awesome
      '.fa', '.fab', '.fas', '.far', '[class*="fa-"]',
      // vendor: material design
      '[class*="material-symbol"]', '[class*="material-icon"]',
      // vendor: glyph icons
      '.glyphicon',
      // vendor: videojs font
      '[class*="vjs-"]',
      // vendor: typicons
      '.typcn',
      // vendor: mui?
      'mu', '[class*="mu-"]'
    ].join(', ');

    const lines: string[] = [];
    lines.push(`*:not(${ blacklistedSelectors }) {`);
    
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
