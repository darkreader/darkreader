const userAgent = typeof navigator === 'undefined' ? 'some useragent' : navigator.userAgent.toLowerCase();
const platform = typeof navigator === 'undefined' ? 'some platform' : navigator.platform.toLowerCase();

export const isChromium = userAgent.includes('chrome') || userAgent.includes('chromium');
export const isThunderbird = userAgent.includes('thunderbird');
export const isFirefox = userAgent.includes('firefox') || isThunderbird;
// Vivaldi attempts to hide itself from User Agent sniffing so we use the following facts:
//  1. Vivaldi does not report its own name, so navigator.userAgentData.brands.length is 2
//  2. Old versions of Vivaldi (prior to Vivaldi 2.10) contain "Vivaldi" in User Agent
//     Details here: https://vivaldi.com/blog/user-agent-changes/
//                   https://vivaldi.com/press/releases/vivaldi-2-10-no-strings-attached/
export const isVivaldi = (typeof navigator === 'object' && (navigator as any).userAgentData && (navigator as any).userAgentData.brands.length < 3) || userAgent.includes('vivaldi');
export const isYaBrowser = userAgent.includes('yabrowser');
// Browser is known to be Opera if:
//  1. navigator.userAgentData entry contains "Opera" or "Opera GX" brand, or
//  2. navigator.userAgent contains "OPR" or "Opera"
export const isOpera = Boolean(typeof navigator === 'object' && (navigator as any).userAgentData && (navigator as any).userAgentData.brands.filter((brand) => brand.brand === 'Opera' || brand.brand === 'Opera GX').length) || userAgent.includes('opr') || userAgent.includes('opera');
export const isEdge = Boolean(typeof navigator === 'object' && (navigator as any).userAgentData && (navigator as any).userAgentData.brands.filter((brand) => brand.brand === 'Microsoft Edge').length) || userAgent.includes('edg');
export const isSafari = userAgent.includes('safari') && !isChromium;
export const isWindows = platform.startsWith('win');
export const isMacOS = platform.startsWith('mac');
// Browser is mobile if at least one is correct:
//  1. navigator.userAgentData.mobile is true
//  2. User Agent string includes 'mobile' (case-insensitive)
export const isMobile = (typeof navigator === 'object' && (navigator as any).userAgentData && (navigator as any).userAgentData.mobile === true) || userAgent.includes('mobile');
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

export const isXMLHttpRequestSupported = typeof XMLHttpRequest === 'function';

export const isFetchSupported = typeof fetch === 'function';

export const isMV3 = (globalThis as any).chrome && (globalThis as any).chrome.runtime && (globalThis as any).chrome.runtime.getManifest && (globalThis as any).chrome.runtime.getManifest().manifest_version === 3;
