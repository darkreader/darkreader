let userAgent = typeof navigator === 'undefined' ? 'some useragent' : navigator.userAgent.toLowerCase();
let platform = typeof navigator === 'undefined' ? 'some platform' : navigator.platform.toLowerCase();


export const isChromium = userAgent.includes('chrome') || userAgent.includes('chromium');
export const isFirefox = userAgent.includes('firefox');
export const isVivaldi = userAgent.includes('vivaldi');
export const isYaBrowser = userAgent.includes('yabrowser');
export const isOpera = userAgent.includes('opr') || userAgent.includes('opera');
export const isEdge = userAgent.includes('edg');
export const isWindows = platform.startsWith('win');
export const isMacOS = platform.startsWith('mac');
export const isMobile = userAgent.includes('mobile');
export const isShadowDomSupported = typeof ShadowRoot === 'function';
export let chromiumVersion: string = null;
let m = userAgent.match(/chrom[e|ium]\/([^ ]+)/);
if (m && m[1]) {
    chromiumVersion = m[1];
} else {
    chromiumVersion = '';
}

// Clean up memory
userAgent = null;
platform = null;
m = null;

export const isDefinedSelectorSupported = (() => {
    try {
        document.querySelector(':defined');
        return true;
    } catch (err) {
        return false;
    }
})();

export const isCSSStyleSheetConstructorSupported = (() => {
    try {
        new CSSStyleSheet();
        return true;
    } catch (err) {
        return false;
    }
})();

export function compareChromeVersions($a: string, $b: string) {
    const a = $a.split('.').map((x) => parseInt(x));
    const b = $b.split('.').map((x) => parseInt(x));
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return a[i] < b[i] ? -1 : 1;
        }
    }
    return 0;
}

