const cssCommentsRegex = /\/\*[\s\S]*?\*\//g;

export function removeCSSComments(cssText: string): string {
    return cssText.replace(cssCommentsRegex, '');
}
