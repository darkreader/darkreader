import {getChromeVersion, compareChromeVersions, isWindows, isMacOS, isVivaldi, isOpera, isYaBrowser} from '../../../utils/platform';

export function popupHasBuiltInBorders() {
    const chromeVersion = getChromeVersion();
    return Boolean(
        chromeVersion &&
        !isVivaldi() &&
        !isYaBrowser() &&
        !isOpera() &&
        isWindows() &&
        compareChromeVersions(chromeVersion, '62.0.3167.0') < 0
    );
}

export function popupHasBuiltInHorizontalBorders() {
    const chromeVersion = getChromeVersion();
    return Boolean(
        chromeVersion &&
        !isVivaldi() &&
        !isYaBrowser() &&
        !isOpera() && (
            (isWindows() && compareChromeVersions(chromeVersion, '62.0.3167.0') >= 0 && compareChromeVersions(chromeVersion, '67.0.3373.0') < 0) ||
            (isMacOS() && compareChromeVersions(chromeVersion, '67.0.3373.0') >= 0)
        )
    );
}
