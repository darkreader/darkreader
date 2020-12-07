import type {FilterConfig, Theme} from '../definitions';
import type {RGBA, HSLA} from '../utils/color';
import {parse, rgbToHSL, hslToRGB, rgbToString, rgbToHexString} from '../utils/color';
import {scale} from '../utils/math';
import {applyColorMatrix, createFilterMatrix} from './utils/matrix';

interface ColorFunction {
    (hsl: HSLA): HSLA;
}

function getBgPole(theme: Theme) {
    const isDarkScheme = theme.mode === 1;
    const prop: keyof Theme = isDarkScheme ? 'darkSchemeBackgroundColor' : 'lightSchemeBackgroundColor';
    return theme[prop];
}

function getFgPole(theme: Theme) {
    const isDarkScheme = theme.mode === 1;
    const prop: keyof Theme = isDarkScheme ? 'darkSchemeTextColor' : 'lightSchemeTextColor';
    return theme[prop];
}

const colorModificationCache = new Map<ColorFunction, Map<string, string>>();
const colorParseCache = new Map<string, HSLA>();

function parseToHSLWithCache(color: string) {
    if (colorParseCache.has(color)) {
        return colorParseCache.get(color);
    }
    const rgb = parse(color);
    const hsl = rgbToHSL(rgb);
    colorParseCache.set(color, hsl);
    return hsl;
}

export function clearColorModificationCache() {
    colorModificationCache.clear();
    colorParseCache.clear();
}

const rgbCacheKeys: Array<keyof RGBA> = ['r', 'g', 'b', 'a'];
const themeCacheKeys: Array<keyof Theme> = ['mode', 'brightness', 'contrast', 'grayscale', 'sepia', 'darkSchemeBackgroundColor', 'darkSchemeTextColor', 'lightSchemeBackgroundColor', 'lightSchemeTextColor'];

function getCacheId(rgb: RGBA, theme: Theme) {
    return rgbCacheKeys.map((k) => rgb[k] as any)
        .concat(themeCacheKeys.map((k) => theme[k]))
        .join(';');
}

function modifyColorWithCache(rgb: RGBA, theme: Theme, modifyHSL: (hsl: HSLA, pole?: HSLA, anotherPole?: HSLA) => HSLA, poleColor?: string, anotherPoleColor?: string) {
    let fnCache: Map<string, string>;
    if (colorModificationCache.has(modifyHSL)) {
        fnCache = colorModificationCache.get(modifyHSL);
    } else {
        fnCache = new Map();
        colorModificationCache.set(modifyHSL, fnCache);
    }
    const id = getCacheId(rgb, theme);
    if (fnCache.has(id)) {
        return fnCache.get(id);
    }

    const hsl = rgbToHSL(rgb);
    const pole = poleColor == null ? null : parseToHSLWithCache(poleColor);
    const anotherPole = anotherPoleColor == null ? null : parseToHSLWithCache(anotherPoleColor);
    const modified = modifyHSL(hsl, pole, anotherPole);
    const {r, g, b, a} = hslToRGB(modified);
    const matrix = createFilterMatrix(theme);
    const [rf, gf, bf] = applyColorMatrix([r, g, b], matrix);

    const color = (a === 1 ?
        rgbToHexString({r: rf, g: gf, b: bf}) :
        rgbToString({r: rf, g: gf, b: bf, a}));

    fnCache.set(id, color);
    return color;
}

function noopHSL(hsl: HSLA) {
    return hsl;
}

export function modifyColor(rgb: RGBA, theme: FilterConfig) {
    return modifyColorWithCache(rgb, theme, noopHSL);
}

function modifyLightSchemeColor(rgb: RGBA, theme: Theme) {
    const poleBg = getBgPole(theme);
    const poleFg = getFgPole(theme);
    return modifyColorWithCache(rgb, theme, modifyLightModeHSL, poleFg, poleBg);
}

function modifyLightModeHSL({h, s, l, a}, poleFg: HSLA, poleBg: HSLA) {
    const isDark = l < 0.5;
    let isNeutral: boolean;
    if (isDark) {
        isNeutral = l < 0.2 || s < 0.12;
    } else {
        const isBlue = h > 200 && h < 280;
        isNeutral = s < 0.24 || (l > 0.8 && isBlue);
    }

    let hx = h;
    let sx = l;
    if (isNeutral) {
        if (isDark) {
            hx = poleFg.h;
            sx = poleFg.s;
        } else {
            hx = poleBg.h;
            sx = poleBg.s;
        }
    }

    const lx = scale(l, 0, 1, poleFg.l, poleBg.l);

    return {h: hx, s: sx, l: lx, a};
}

const MAX_BG_LIGHTNESS = 0.4;

function modifyBgHSL({h, s, l, a}: HSLA, pole: HSLA) {
    const isDark = l < 0.5;
    const isBlue = h > 200 && h < 280;
    const isNeutral = s < 0.12 || (l > 0.8 && isBlue);
    if (isDark) {
        const lx = scale(l, 0, 0.5, 0, MAX_BG_LIGHTNESS);
        if (isNeutral) {
            const hx = pole.h;
            const sx = pole.s;
            return {h: hx, s: sx, l: lx, a};
        }
        return {h, s, l: lx, a};
    }

    const lx = scale(l, 0.5, 1, MAX_BG_LIGHTNESS, pole.l);

    if (isNeutral) {
        const hx = pole.h;
        const sx = pole.s;
        return {h: hx, s: sx, l: lx, a};
    }

    let hx = h;
    const isYellow = h > 60 && h < 180;
    if (isYellow) {
        const isCloserToGreen = h > 120;
        if (isCloserToGreen) {
            hx = scale(h, 120, 180, 135, 180);
        } else {
            hx = scale(h, 60, 120, 60, 105);
        }
    }

    return {h: hx, s, l: lx, a};
}

export function modifyBackgroundColor(rgb: RGBA, theme: Theme) {
    if (theme.mode === 0) {
        return modifyLightSchemeColor(rgb, theme);
    }
    const pole = getBgPole(theme);
    return modifyColorWithCache(rgb, {...theme, mode: 0}, modifyBgHSL, pole);
}

const MIN_FG_LIGHTNESS = 0.55;

function modifyBlueFgHue(hue: number) {
    return scale(hue, 205, 245, 205, 220);
}

function modifyFgHSL({h, s, l, a}: HSLA, pole: HSLA) {
    const isLight = l > 0.5;
    const isNeutral = l < 0.2 || s < 0.24;
    const isBlue = !isNeutral && h > 205 && h < 245;
    if (isLight) {
        const lx = scale(l, 0.5, 1, MIN_FG_LIGHTNESS, pole.l);
        if (isNeutral) {
            const hx = pole.h;
            const sx = pole.s;
            return {h: hx, s: sx, l: lx, a};
        }
        let hx = h;
        if (isBlue) {
            hx = modifyBlueFgHue(h);
        }
        return {h: hx, s, l: lx, a};
    }

    if (isNeutral) {
        const hx = pole.h;
        const sx = pole.s;
        const lx = scale(l, 0, 0.5, pole.l, MIN_FG_LIGHTNESS);
        return {h: hx, s: sx, l: lx, a};
    }

    let hx = h;
    let lx: number;
    if (isBlue) {
        hx = modifyBlueFgHue(h);
        lx = scale(l, 0, 0.5, pole.l, Math.min(1, MIN_FG_LIGHTNESS + 0.05));
    } else {
        lx = scale(l, 0, 0.5, pole.l, MIN_FG_LIGHTNESS);
    }

    return {h: hx, s, l: lx, a};
}

export function modifyForegroundColor(rgb: RGBA, theme: Theme) {
    if (theme.mode === 0) {
        return modifyLightSchemeColor(rgb, theme);
    }
    const pole = getFgPole(theme);
    return modifyColorWithCache(rgb, {...theme, mode: 0}, modifyFgHSL, pole);
}

function modifyBorderHSL({h, s, l, a}, poleFg: HSLA, poleBg: HSLA) {
    const isDark = l < 0.5;
    const isNeutral = l < 0.2 || s < 0.24;

    let hx = h;
    let sx = s;

    if (isNeutral) {
        if (isDark) {
            hx = poleFg.h;
            sx = poleFg.s;
        } else {
            hx = poleBg.h;
            sx = poleBg.s;
        }
    }

    const lx = scale(l, 0, 1, 0.5, 0.2);

    return {h: hx, s: sx, l: lx, a};
}

export function modifyBorderColor(rgb: RGBA, theme: Theme) {
    if (theme.mode === 0) {
        return modifyLightSchemeColor(rgb, theme);
    }
    const poleFg = getFgPole(theme);
    const poleBg = getBgPole(theme);
    return modifyColorWithCache(rgb, {...theme, mode: 0}, modifyBorderHSL, poleFg, poleBg);
}

export function modifyShadowColor(rgb: RGBA, filter: FilterConfig) {
    return modifyBackgroundColor(rgb, filter);
}

export function modifyGradientColor(rgb: RGBA, filter: FilterConfig) {
    return modifyBackgroundColor(rgb, filter);
}
