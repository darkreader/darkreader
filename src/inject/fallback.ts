import {wasEnabledForHost} from './cache';

if (
    document.documentElement instanceof HTMLHtmlElement &&
    matchMedia('(prefers-color-scheme: dark)').matches &&
    wasEnabledForHost() !== false &&
    !document.querySelector('.darkreader--fallback') &&
    !document.querySelector('.darkreader')
) {
    const css = [
        'html, body, body :not(iframe) {',
        '    background-color: #181a1b !important;',
        '    border-color: #776e62 !important;',
        '    color: #e8e6e3 !important;',
        '}',
        'html, body {',
        '    opacity: 1 !important;',
        '    transition: none !important;',
        '}',
        // MS Learn High Contrast issue
        // https://github.com/darkreader/darkreader/issues/3618
        'div[style*="background-color: rgb(135, 135, 135)"] {',
        '    background-color: #878787 !important;',
        '}',
    ].join('\n');
    const fallback = document.createElement('style');
    fallback.classList.add('darkreader');
    fallback.classList.add('darkreader--fallback');
    fallback.media = 'screen';
    fallback.textContent = css;

    if (document.head) {
        document.head.append(fallback);
    } else {
        const root = document.documentElement;
        root.append(fallback);
        const observer = new MutationObserver(() => {
            if (document.head) {
                observer.disconnect();
                if (fallback.isConnected) {
                    document.head.append(fallback);
                }
            }
        });
        observer.observe(root, {childList: true});
    }
}

declare const __FIREFOX_MV2__: boolean;

if (__FIREFOX_MV2__ && (location.host === 'teams.live.com' || location.host === 'teams.microsoft.com')) {
    // Microsoft Teams calls sheet.cssRules on extension styles and that
    // causes "Not allowed to access cross-origin stylesheet" in Firefox
    (() => {
        const descriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'cssRules')!;
        Object.defineProperty(CSSStyleSheet.prototype, 'cssRules', {
            ...descriptor,
            get: function () {
                if (this.ownerNode?.classList?.contains('darkreader')) {
                    return [];
                }
                return descriptor.get!.call(this) as CSSStyleSheet[];
            },
        });
    })();
}
