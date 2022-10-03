declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;
declare const __FIREFOX__: boolean;
declare const __THUNDERBIRD__: boolean;
declare const __TEST__: boolean;

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
const userAgent = isNavigatorDefined ? (navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)) ?
    navigator.userAgentData.brands.map((brand) => `${brand.brand.toLowerCase()} ${brand.version}`).join(' ') : navigator.userAgent.toLowerCase()
    : 'some useragent';

const platform = isNavigatorDefined ? (navigator.userAgentData && typeof navigator.userAgentData.platform === 'string') ?
    navigator.userAgentData.platform.toLowerCase() : navigator.platform.toLowerCase()
    : 'some platform';

// Note: if you are using these constants in tests, make sure they are not compiled out by adding __TEST__ to them
export const isChromium = __CHROMIUM_MV2__ || __CHROMIUM_MV3__ || (!__FIREFOX__ && !__THUNDERBIRD__ && (userAgent.includes('chrome') || userAgent.includes('chromium')));
export const isThunderbird = __THUNDERBIRD__ || (!__CHROMIUM_MV2__ && !__CHROMIUM_MV3__ && userAgent.includes('thunderbird'));
export const isFirefox = __FIREFOX__ || isThunderbird || ((__TEST__ || (!__CHROMIUM_MV2__ && !__CHROMIUM_MV3__)) && (userAgent.includes('firefox') || userAgent.includes('librewolf')));
export const isVivaldi = (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) && (!__FIREFOX__ && !__THUNDERBIRD__ && userAgent.includes('vivaldi'));
export const isYaBrowser = (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) && (!__FIREFOX__ && !__THUNDERBIRD__ && userAgent.includes('yabrowser'));
export const isOpera = (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) && (!__FIREFOX__ && !__THUNDERBIRD__ && (userAgent.includes('opr') || userAgent.includes('opera')));
export const isEdge = (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) && (!__FIREFOX__ && !__THUNDERBIRD__ && userAgent.includes('edg'));
export const isSafari = !__CHROMIUM_MV2__ && !__CHROMIUM_MV3__ && !__FIREFOX__ && !__THUNDERBIRD__ && userAgent.includes('safari') && !isChromium;
export const isWindows = platform.startsWith('win');
export const isMacOS = platform.startsWith('mac');
export const isLinux = isNavigatorDefined ? ((navigator.userAgentData && navigator.userAgentData.platform === 'Linux') || (navigator.userAgent && navigator.userAgent.includes('Linux'))) : false;
export const isMobile = (isNavigatorDefined && navigator.userAgentData) ? navigator.userAgentData.mobile : userAgent.includes('mobile');
export const isShadowDomSupported = typeof ShadowRoot === 'function';
export const isMatchMediaChangeEventListenerSupported = __CHROMIUM_MV3__ || (
    typeof MediaQueryList === 'function' &&
    typeof MediaQueryList.prototype.addEventListener === 'function'
);
// Note: make sure that this value matches manifest.json keys
export const isNonPersistent = !__FIREFOX__ && !__THUNDERBIRD__ && (__CHROMIUM_MV3__ || isSafari);

export const chromiumVersion = (() => {
    const m = userAgent.match(/chrom(?:e|ium)(?:\/| )([^ ]+)/);
    if (m && m[1]) {
        return m[1];
    }
    return '';
})();

export const firefoxVersion = (() => {
    const m = userAgent.match(/(?:firefox|librewolf)(?:\/| )([^ ]+)/);
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

export const isCSSColorSchemePropSupported = (() => {
    if (typeof document === 'undefined') {
        return false;
    }
    const el = document.createElement('div');
    el.setAttribute('style', 'color-scheme: dark');
    return el.style && el.style.colorScheme === 'dark';
})();
