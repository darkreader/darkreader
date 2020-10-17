import {PlatformData} from '../definitions';

export const platformData: PlatformData = {} as any;

export function runPlatformTest() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    platformData.isChromium = userAgent.includes('chrome') || userAgent.includes('chromium');
    platformData.isFirefox = userAgent.includes('firefox');
    platformData.isVivaldi = userAgent.includes('vivaldi');
    platformData.isYaBrowser = userAgent.includes('yabrowser');
    platformData.isOpera = userAgent.includes('opr') || userAgent.includes('opera');
    platformData.isEdge = userAgent.includes('edg');
    platformData.isWindows = platform.startsWith('win');
    platformData.isMacOS = platform.startsWith('mac');
    platformData.isMobile = userAgent.includes('mobile');
    const m = userAgent.match(/chrom[e|ium]\/([^ ]+)/);
    if (m && m[1]) {
        platformData.chromiumVersion = m[1];
    } else {
        platformData.chromiumVersion = '';
    }
    try {
        document.querySelector(':defined');
        platformData.isDefinedSelectorSupported = true;
    } catch (err) {
        platformData.isDefinedSelectorSupported = false;
    }
    platformData.isShadowDomSupported = typeof ShadowRoot === 'function';
    try {
        new CSSStyleSheet();
        platformData.isCSSStyleSheetConstructorSupported = true;
    } catch (err) {
        platformData.isCSSStyleSheetConstructorSupported = false;
    }
}

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

