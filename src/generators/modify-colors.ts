import {parse, rgbToHSL, hslToRGB, rgbToString, rgbToHexString, RGBA, HSLA} from '../utils/color';
import {scale} from '../utils/math';
import {applyColorMatrix, createFilterMatrix} from './utils/matrix';
import {FilterConfig, Theme} from '../definitions';

interface ColorFunction {
    (hsl: HSLA): HSLA;
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

const rgbCacheKeys: (keyof RGBA)[] = ['r', 'g', 'b', 'a'];
const themeCacheKeys: (keyof Theme)[] = ['mode', 'brightness', 'contrast', 'grayscale', 'sepia', 'backgroundColor', 'textColor'];

function getCacheId(rgb: RGBA, theme: Theme) {
    return rgbCacheKeys.map((k) => rgb[k] as any)
        .concat(themeCacheKeys.map((k) => theme[k]))
        .join(';');
}

function modifyColorWithCache(rgb: RGBA, theme: Theme, modifyHSL: (hsl: HSLA, pole?: HSLA) => HSLA, poleColor?: string) {
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
    const modified = modifyHSL(hsl, pole);
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

function modifyLightModeHSL({h, s, l, a}) {
    const lMin = 0;
    const lMid = 0.4;
    const lMax = 0.9;
    const sNeutralLim = 0.36;
    const lNeutralDark = 0.2;
    const lNeutralLight = 0.8;
    const sColored = 0.16;
    const hColoredL0 = 205;
    const hColoredL1 = 40;

    const lx = scale(l, 0, 1, lMin, lMax);

    let hx = h;
    let sx = s;
    const isNeutral = l < lNeutralDark || l > lNeutralLight || s < sNeutralLim;
    if (isNeutral) {
        sx = (l < lMid ?
            scale(l, 0, lMid, sColored, 0) :
            scale(l, lMid, 1, 0, sColored));
        hx = (l < lMid ? hColoredL0 : hColoredL1);
    }

    return {h: hx, s: sx, l: lx, a};
}

const MAX_BG_LIGHTNESS = 0.4;

function modifyBgHSL({h, s, l, a}: HSLA, pole: HSLA) {
    const isDark = l < 0.5;
    const isBlue = h > 200 && h < 280;
    const isNeutral = s < 0.12 || (l > 0.8 && isBlue);
    if (isDark) {
        const lx = scale(l, 0, 0.5, pole.l, MAX_BG_LIGHTNESS);
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
        return modifyColorWithCache(rgb, theme, modifyLightModeHSL);
    }
    const pole = theme.backgroundColor === 'auto' ? '#181a1b' : theme.backgroundColor;
    return modifyColorWithCache(rgb, {...theme, mode: 0}, modifyBgHSL, pole);
}

const MIN_FG_LIGHTNESS = 0.55;

function modifyFgHSL({h, s, l, a}: HSLA, pole: HSLA) {
    const isLight = l > 0.5;
    const isNeutral = l < 0.2 || s < 0.24;
    if (isLight) {
        const lx = scale(l, 0.5, 1, MIN_FG_LIGHTNESS, pole.l);
        if (isNeutral) {
            const hx = pole.h;
            const sx = pole.s;
            return {h: hx, s: sx, l: lx, a};
        }
        return {h, s, l: lx, a};
    }

    if (isNeutral) {
        const hx = pole.h;
        const sx = pole.s;
        const lx = scale(l, 0, 0.5, pole.l, MIN_FG_LIGHTNESS);
        return {h: hx, s: sx, l: lx, a};
    }

    let hx = h;
    let lx = l;
    const isBlue = h > 205 && h < 245;
    if (isBlue) {
        hx = scale(h, 205, 245, 205, 220);
        lx = scale(l, 0, 0.5, pole.l, Math.min(1, MIN_FG_LIGHTNESS + 0.05));
    } else {
        lx = scale(l, 0, 0.5, pole.l, MIN_FG_LIGHTNESS);
    }

    return {h: hx, s, l: lx, a};
}

export function modifyForegroundColor(rgb: RGBA, theme: Theme) {
    if (theme.mode === 0) {
        return modifyColorWithCache(rgb, theme, modifyLightModeHSL);
    }
    const pole = theme.textColor === 'auto' ? '#e8e6e3' : theme.textColor;
    return modifyColorWithCache(rgb, {...theme, mode: 0}, modifyFgHSL, pole);
}

function modifyBorderHSL({h, s, l, a}) {
    const lMinS0 = 0.2;
    const lMinS1 = 0.3;
    const lMaxS0 = 0.4;
    const lMaxS1 = 0.5;

    const lMin = scale(s, 0, 1, lMinS0, lMinS1);
    const lMax = scale(s, 0, 1, lMaxS0, lMaxS1);
    const lx = scale(l, 0, 1, lMax, lMin);

    return {h, s, l: lx, a};
}

export function modifyBorderColor(rgb: RGBA, filter: FilterConfig) {
    if (filter.mode === 0) {
        return modifyColorWithCache(rgb, filter, modifyLightModeHSL);
    }
    return modifyColorWithCache(rgb, {...filter, mode: 0}, modifyBorderHSL);
}

export function modifyShadowColor(rgb: RGBA, filter: FilterConfig) {
    return modifyBackgroundColor(rgb, filter);
}

export function modifyGradientColor(rgb: RGBA, filter: FilterConfig) {
    return modifyBackgroundColor(rgb, filter);
}
