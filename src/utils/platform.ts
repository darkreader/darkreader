interface UserAgentData {
    brands: Array<{
        brand: string;
        version: string;
    }>;
    mobile: boolean;
    platform: string;
}

declare global {
    interface NavigatorID {
        userAgentData: UserAgentData;
    }
}

const isNavigatorDefined = typeof navigator !== 'undefined';
const userAgent = isNavigatorDefined ? navigator.userAgentData ?
    navigator.userAgentData.brands.map((brand) => `${brand.brand.toLowerCase()} ${brand.version}`).join(' ') : navigator.userAgent.toLowerCase()
    : 'some useragent';

const platform = isNavigatorDefined ? navigator.userAgentData ?
    navigator.userAgentData.platform.toLowerCase() : navigator.platform.toLowerCase()
    : 'some platform';

export const isChromium = userAgent.includes('chrome') || userAgent.includes('chromium');
export const isThunderbird = userAgent.includes('thunderbird');
export const isFirefox = userAgent.includes('firefox') || userAgent.includes('librewolf') || isThunderbird;
export const isVivaldi = userAgent.includes('vivaldi');
export const isYaBrowser = userAgent.includes('yabrowser');
export const isOpera = userAgent.includes('opr') || userAgent.includes('opera');
export const isEdge = userAgent.includes('edg');
export const isSafari = userAgent.includes('safari') && !isChromium;
export const isWindows = platform.startsWith('win');
export const isMacOS = platform.startsWith('mac');
export const isMobile = (isNavigatorDefined && navigator.userAgentData) ? navigator.userAgentData.mobile : userAgent.includes('mobile');
export const isShadowDomSupported = typeof ShadowRoot === 'function';
export const isMatchMediaChangeEventListenerSupported = (
    typeof MediaQueryList === 'function' &&
    typeof MediaQueryList.prototype.addEventListener === 'function'
);

export const chromiumVersion = (() => {
    const m = userAgent.match(/chrom(?:e|ium)(?:\/| )([^ ]+)/);
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

export const isCSSColorSchemePropSupported = (() => {
    if (typeof document === 'undefined') {
        return false;
    }
    const el = document.createElement('div');
    el.setAttribute('style', 'color-scheme: dark');
    return el.style && el.style.colorScheme === 'dark';
})();
