import type {DetectorHint} from '../definitions';
import {getSRGBLightness, parseColorWithCache} from '../utils/color';
import {isSystemDarkModeEnabled} from '../utils/media-query';

const COLOR_SCHEME_META_SELECTOR = 'meta[name="color-scheme"]';

function hasBuiltInDarkTheme() {
    const rootStyle = getComputedStyle(document.documentElement);
    if (rootStyle.filter.includes('invert(1)') || rootStyle.colorScheme === 'dark') {
        return true;
    }

    const CELL_SIZE = 256;
    const MAX_ROW_COUNT = 4;
    const winWidth = innerWidth;
    const winHeight = innerHeight;
    const stepX = Math.floor(winWidth / Math.min(MAX_ROW_COUNT, Math.ceil(winWidth / CELL_SIZE)));
    const stepY = Math.floor(winHeight / Math.min(MAX_ROW_COUNT, Math.ceil(winHeight / CELL_SIZE)));

    const processedElements = new Set<Element>();

    for (let y = Math.floor(stepY / 2); y < winHeight; y += stepY) {
        for (let x = Math.floor(stepX / 2); x < winWidth; x += stepX) {
            const element = document.elementFromPoint(x, y);
            if (!element || processedElements.has(element)) {
                continue;
            }
            processedElements.add(element);
            const style = element === document.documentElement ? rootStyle : getComputedStyle(element);
            const bgColor = parseColorWithCache(style.backgroundColor);
            if (!bgColor) {
                return false;
            }
            if (bgColor.r === 24 && bgColor.g === 26 && bgColor.b === 27) {
                // For some websites changes to CSSStyleSheet.disabled and HTMLStyleElement.textContent
                // are not being applied synchronously. For example https://zorin.com/
                // Probably a browser bug. Treat as not having a dark theme.
                return false;
            }
            if (bgColor.a === 1) {
                const bgLightness = getSRGBLightness(bgColor.r, bgColor.g, bgColor.b);
                if (bgLightness > 0.5) {
                    return false;
                }
            } else {
                const textColor = parseColorWithCache(style.color);
                if (!textColor) {
                    return false;
                }
                const textLightness = getSRGBLightness(textColor.r, textColor.g, textColor.b);
                if (textLightness < 0.5) {
                    return false;
                }
            }
        }
    }

    const rootColor = parseColorWithCache(rootStyle.backgroundColor);
    if (!rootColor) {
        return false;
    }
    const bodyColor = document.body ? parseColorWithCache(getComputedStyle(document.body).backgroundColor) : {r: 0, g: 0, b: 0, a: 0};
    if (!bodyColor) {
        return false;
    }
    const rootLightness = (1 - rootColor.a!) + rootColor.a! * getSRGBLightness(rootColor.r, rootColor.g, rootColor.b);
    const finalLightness = (1 - bodyColor.a!) * rootLightness + bodyColor.a! * getSRGBLightness(bodyColor.r, bodyColor.g, bodyColor.b);
    return finalLightness < 0.5;
}

function runCheck(callback: (hasDarkTheme: boolean) => void) {
    const colorSchemeMeta = document.querySelector(COLOR_SCHEME_META_SELECTOR) as HTMLMetaElement;
    if (colorSchemeMeta) {
        const isMetaDark = colorSchemeMeta.content === 'dark' || (colorSchemeMeta.content.includes('dark') && isSystemDarkModeEnabled());
        callback(isMetaDark);
        return;
    }

    if (
        document.documentElement.classList.contains('dark') ||
        document.body?.classList.contains('dark') ||
        document.documentElement.dataset.theme?.toLocaleLowerCase() === 'dark'
    ) {
        callback(true);
        return;
    }

    const drSheets = Array.from(document.styleSheets).filter((s) => (s.ownerNode as HTMLElement)?.classList.contains('darkreader'))
        .concat(
            Array.isArray(document.adoptedStyleSheets) ? Array.from(document.adoptedStyleSheets).filter(
                (s) => (s.cssRules?.[0] as CSSStyleRule)?.selectorText?.startsWith('#__darkreader')
            ) : [],
        );
    drSheets.forEach((sheet) => sheet.disabled = true);

    const darkThemeDetected = hasBuiltInDarkTheme();

    drSheets.forEach((sheet) => sheet.disabled = false);
    callback(darkThemeDetected);
}

function hasSomeStyle() {
    if (document.querySelector(COLOR_SCHEME_META_SELECTOR) != null) {
        return true;
    }
    if (document.documentElement.style.backgroundColor || (document.body && document.body.style.backgroundColor)) {
        return true;
    }
    for (const style of document.styleSheets) {
        if (style && style.ownerNode && !((style.ownerNode as HTMLElement).classList && (style.ownerNode as HTMLElement).classList.contains('darkreader'))) {
            return true;
        }
    }
    return false;
}

let observer: MutationObserver | null;
let readyStateListener: (() => void) | null;

function canCheckForStyle() {
    if (!(
        document.body &&
        document.body.scrollHeight > 0 &&
        document.body.clientHeight > 0 &&
        document.body.childElementCount > 0 &&
        hasSomeStyle()
    )) {
        return false;
    }
    for (const child of document.body.children) {
        if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'LINK') {
            return true;
        }
    }
    return false;
}

export function runDarkThemeDetector(callback: (hasDarkTheme: boolean) => void, hints: DetectorHint[]): void {
    stopDarkThemeDetector();
    if (hints && hints.length > 0) {
        const hint = hints[0];
        if (hint.noDarkTheme) {
            callback(false);
            return;
        }
        if (hint.systemTheme && isSystemDarkModeEnabled()) {
            callback(true);
            return;
        }
        detectUsingHint(hint, () => callback(true));
        return;
    }

    if (canCheckForStyle()) {
        runCheck(callback);
        return;
    }

    observer = new MutationObserver(() => {
        if (canCheckForStyle()) {
            stopDarkThemeDetector();
            runCheck(callback);
        }
    });
    observer.observe(document.documentElement, {childList: true});

    if (document.readyState !== 'complete') {
        readyStateListener = () => {
            if (document.readyState === 'complete') {
                stopDarkThemeDetector();
                runCheck(callback);
            }
        };
        // readystatechange event is not cancellable and does not bubble
        document.addEventListener('readystatechange', readyStateListener);
    }
}

export function stopDarkThemeDetector(): void {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    if (readyStateListener) {
        document.removeEventListener('readystatechange', readyStateListener);
        readyStateListener = null;
    }
    stopDetectingUsingHint();
}

let hintTargetObserver: MutationObserver;
let hintMatchObserver: MutationObserver;

function detectUsingHint(hint: DetectorHint, success: () => void) {
    stopDetectingUsingHint();

    const matchSelector = (hint.match || []).join(', ');

    function checkMatch(target: Element) {
        if (target.matches?.(matchSelector)) {
            stopDetectingUsingHint();
            success();
            return true;
        }
        return false;
    }

    function setupMatchObserver(target: Element) {
        hintMatchObserver?.disconnect();
        if (checkMatch(target)) {
            return;
        }
        hintMatchObserver = new MutationObserver(() => checkMatch(target));
        hintMatchObserver.observe(target, {attributes: true});
    }

    const target = document.querySelector(hint.target);
    if (target) {
        setupMatchObserver(target);
    } else {
        hintTargetObserver = new MutationObserver((mutations) => {
            const handledTargets = new Set<Node>();
            for (const mutation of mutations) {
                if (handledTargets.has(mutation.target)) {
                    continue;
                }
                handledTargets.add(mutation.target);
                if (mutation.target instanceof Element) {
                    const target = mutation.target.querySelector(hint.target);
                    if (target) {
                        hintTargetObserver.disconnect();
                        setupMatchObserver(target);
                        break;
                    }
                }
            }
        });
        hintTargetObserver.observe(document.documentElement, {childList: true, subtree: true});
    }
}

function stopDetectingUsingHint() {
    hintTargetObserver?.disconnect();
    hintMatchObserver?.disconnect();
}
