const userAgent = typeof navigator === 'undefined' ? 'some useragent' : navigator.userAgent.toLowerCase();
const platform = typeof navigator === 'undefined' ? 'some platform' : navigator.platform.toLowerCase();

export const isChromium = userAgent.includes('chrome') || userAgent.includes('chromium');
export const isThunderbird = userAgent.includes('thunderbird');
export const isFirefox = userAgent.includes('firefox') || isThunderbird;
export const isVivaldi = userAgent.includes('vivaldi');
export const isYaBrowser = userAgent.includes('yabrowser');
export const isOpera = userAgent.includes('opr') || userAgent.includes('opera');
export const isEdge = userAgent.includes('edg');
export const isSafari = userAgent.includes('safari') && !isChromium;
export const isWindows = platform.startsWith('win');
export const isMacOS = platform.startsWith('mac');
export const isMobile = userAgent.includes('mobile');
export const isShadowDomSupported = typeof ShadowRoot === 'function';
export const isMatchMediaChangeEventListenerSupported = (
    typeof MediaQueryList === 'function' &&
    typeof MediaQueryList.prototype.addEventListener === 'function'
);

export const chromiumVersion = (() => {
    const m = userAgent.match(/chrom[e|ium]\/([^ ]+)/);
    if (m && m[1]) {
        return m[1];
    }
    return '';
})();

export const isDefinedSelectorSupported = (() => {
    try {
        document.querySelector(':defined');
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

