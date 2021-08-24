import {compareChromeVersions, chromiumVersion, isWindows, isOpera, isYaBrowser, isVivaldi, isEdge, isMacOS, isThunderbird} from '../../../utils/platform';


export function popupHasBuiltInBorders() {
    return Boolean(
        chromiumVersion &&
        !isVivaldi &&
        !isYaBrowser &&
        !isOpera &&
        isWindows &&
        compareChromeVersions(chromiumVersion, '62.0.3167.0') < 0
    );
}

export function popupHasBuiltInHorizontalBorders() {
    return Boolean(
        chromiumVersion &&
        !isVivaldi &&
        !isYaBrowser &&
        !isEdge &&
        !isOpera && (
            (isWindows && compareChromeVersions(chromiumVersion, '62.0.3167.0') >= 0) && compareChromeVersions(chromiumVersion, '74.0.0.0') < 0 ||
            (isMacOS && compareChromeVersions(chromiumVersion, '67.0.3373.0') >= 0 && compareChromeVersions(chromiumVersion, '73.0.3661.0') < 0)
        )
    );
}

export function fixNotClosingPopupOnNavigation() {
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button === 2) {
            return;
        }
        let target = e.target as HTMLElement;
        while (target && !(target instanceof HTMLAnchorElement)) {
            target = target.parentElement;
        }
        if (target && target.hasAttribute('href')) {
            chrome.tabs.create({url: target.getAttribute('href')});
            e.preventDefault();
            if (!isThunderbird) {
                window.close();
            }
        }
    });
}
