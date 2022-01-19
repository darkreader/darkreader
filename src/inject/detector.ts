import {parse, getSRGBLightness} from '../utils/color';

function hasBuiltInDarkTheme() {
    const drStyles = document.querySelectorAll('.darkreader') as NodeListOf<HTMLStyleElement & {disabled: boolean}>;
    drStyles.forEach((style) => style.disabled = true);

    const rootColor = parse(getComputedStyle(document.documentElement).backgroundColor);
    const bodyColor = document.body ? parse(getComputedStyle(document.body).backgroundColor) : {r: 0, g: 0, b: 0, a: 0};
    const rootLightness = (1 - rootColor.a) + rootColor.a * getSRGBLightness(rootColor.r, rootColor.g, rootColor.b);
    const finalLightness = (1 - bodyColor.a) * rootLightness + bodyColor.a * getSRGBLightness(bodyColor.r, bodyColor.g, bodyColor.b);
    const darkThemeDetected = finalLightness < 0.5;

    drStyles.forEach((style) => style.disabled = false);
    return darkThemeDetected;
}

function runCheck(callback: (hasDarkTheme: boolean) => void) {
    const darkThemeDetected = hasBuiltInDarkTheme();
    callback(darkThemeDetected);
}

let observer: MutationObserver;
let readyStateListener: () => void;

export function runDarkThemeDetector(callback: (hasDarkTheme: boolean) => void) {
    stopDarkThemeDetector();
    if (document.body) {
        runCheck(callback);
    } else {
        const observer = new MutationObserver(() => {
            if (document.body) {
                stopDarkThemeDetector();
                runCheck(callback);
            }
        });
        observer.observe(document.documentElement, {childList: true});
    }
    if (document.readyState !== 'complete') {
        readyStateListener = () => {
            if (document.readyState === 'complete') {
                stopDarkThemeDetector();
                runCheck(callback);
            }
        };
        document.addEventListener('readystatechange', readyStateListener);
    }
}

export function stopDarkThemeDetector() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    if (readyStateListener) {
        document.removeEventListener('readystatechange', readyStateListener);
        readyStateListener = null;
    }
}
