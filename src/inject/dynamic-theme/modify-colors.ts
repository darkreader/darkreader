import {extendThemeCacheKeys, getBackgroundPoles, getTextPoles, modifyBgColorExtended, modifyFgColorExtended, modifyLightSchemeColorExtended} from '@plus/utils/theme';
import type {Theme} from '../../definitions';
import {applyColorMatrix, createFilterMatrix} from '../../generators/utils/matrix';
import {getRegisteredColor, registerColor} from '../../inject/dynamic-theme/palette';
import type {RGBA, HSLA} from '../../utils/color';
import {parseToHSLWithCache, rgbToHSL, hslToRGB, rgbToString, rgbToHexString} from '../../utils/color';
import {scale} from '../../utils/math';

interface ColorFunction {
    (hsl: HSLA): HSLA;
}

declare const __PLUS__: boolean;

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

export function clearColorModificationCache(): void {
    colorModificationCache.clear();
}

const rgbCacheKeys: Array<keyof RGBA> = ['r', 'g', 'b', 'a'];

export const themeCacheKeys: Array<keyof Theme> = [
    'mode',
    'brightness',
    'contrast',
    'grayscale',
    'sepia',
    'darkSchemeBackgroundColor',
    'darkSchemeTextColor',
    'lightSchemeBackgroundColor',
    'lightSchemeTextColor',
];
extendThemeCacheKeys(themeCacheKeys);

function getCacheId(rgb: RGBA, theme: Theme): string {
    let resultId = '';
    rgbCacheKeys.forEach((key) => {
        resultId += `${rgb[key]};`;
    });
    themeCacheKeys.forEach((key) => {
        resultId += `${theme[key]};`;
    });
    return resultId;
}

function modifyColorWithCache(rgb: RGBA, theme: Theme, modifyHSL: (hsl: HSLA, pole?: HSLA | null, anotherPole?: HSLA | null) => HSLA, poleColor?: string, anotherPoleColor?: string): string {
    let fnCache: Map<string, string>;
    if (colorModificationCache.has(modifyHSL)) {
        fnCache = colorModificationCache.get(modifyHSL)!;
    } else {
        fnCache = new Map();
        colorModificationCache.set(modifyHSL, fnCache);
    }
    const id = getCacheId(rgb, theme);
    if (fnCache.has(id)) {
        return fnCache.get(id)!;
    }

    const hsl = rgbToHSL(rgb);
    const pole = poleColor == null ? null : parseToHSLWithCache(poleColor);
    const anotherPole = anotherPoleColor == null ? null : parseToHSLWithCache(anotherPoleColor);
    const modified = modifyHSL(hsl, pole, anotherPole);
    const {r, g, b, a} = hslToRGB(modified);
    const matrix = createFilterMatrix({...theme, mode: 0});
    const [rf, gf, bf] = applyColorMatrix([r, g, b], matrix);

    const color = (a === 1 ?
        rgbToHexString({r: rf, g: gf, b: bf}) :
        rgbToString({r: rf, g: gf, b: bf, a}));

    fnCache.set(id, color);
    return color;
}

function noopHSL(hsl: HSLA): HSLA {
    return hsl;
}

export function modifyColor(rgb: RGBA, theme: Theme): string {
    return modifyColorWithCache(rgb, theme, noopHSL);
}

function modifyAndRegisterColor(
    type: 'background' | 'text' | 'border',
    rgb: RGBA,
    theme: Theme,
    modifier: (rgb: RGBA, theme: Theme) => string,
) {
    const registered = getRegisteredColor(type, rgb);
    if (registered) {
        return registered;
    }
    const value = modifier(rgb, theme);
    return registerColor(type, rgb, value);
}

function modifyLightSchemeColor(rgb: RGBA, theme: Theme): string {
    const poleBg = getBgPole(theme);
    const poleFg = getFgPole(theme);
    return modifyColorWithCache(rgb, theme, modifyLightModeHSL, poleFg, poleBg);
}

function modifyLightModeHSL({h, s, l, a}: HSLA, poleFg: HSLA, poleBg: HSLA): HSLA {
    const isDark = l < 0.5;
    let isNeutral: boolean;
    if (isDark) {
        isNeutral = l < 0.2 || s < 0.12;
    } else {
        const isBlue = h > 200 && h < 280;
        isNeutral = s < 0.24 || (l > 0.8 && isBlue);
    }

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

    const lx = scale(l, 0, 1, poleFg.l, poleBg.l);

    return {h: hx, s: sx, l: lx, a};
}

const MAX_BG_LIGHTNESS = 0.4;

function modifyBgHSL({h, s, l, a}: HSLA, pole: HSLA): HSLA {
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

    let lx = scale(l, 0.5, 1, MAX_BG_LIGHTNESS, pole.l);

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

    // Lower the lightness, if the resulting
    // hue is in lower yellow spectrum.
    if (hx > 40 && hx < 80) {
        lx *= 0.75;
    }

    return {h: hx, s, l: lx, a};
}

function _modifyBackgroundColor(rgb: RGBA, theme: Theme) {
    if (theme.mode === 0) {
        if (__PLUS__) {
            const poles = getBackgroundPoles(theme);
            return modifyColorWithCache(rgb, theme, modifyLightSchemeColorExtended, poles[0], poles[1]);
        }
        return modifyLightSchemeColor(rgb, theme);
    }
    if (__PLUS__) {
        const poles = getBackgroundPoles(theme);
        return modifyColorWithCache(rgb, theme, modifyBgColorExtended, poles[0], poles[1]);
    }
    const pole = getBgPole(theme);
    return modifyColorWithCache(rgb, theme, modifyBgHSL, pole);
}

export function modifyBackgroundColor(rgb: RGBA, theme: Theme, shouldRegisterColorVariable = true): string {
    if (!shouldRegisterColorVariable) {
        return _modifyBackgroundColor(rgb, theme);
    }
    return modifyAndRegisterColor('background', rgb, theme, _modifyBackgroundColor);
}

const MIN_FG_LIGHTNESS = 0.55;

function modifyBlueFgHue(hue: number): number {
    return scale(hue, 205, 245, 205, 220);
}

function modifyFgHSL({h, s, l, a}: HSLA, pole: HSLA): HSLA {
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

function _modifyForegroundColor(rgb: RGBA, theme: Theme) {
    if (theme.mode === 0) {
        if (__PLUS__) {
            const poles = getTextPoles(theme);
            return modifyColorWithCache(rgb, theme, modifyLightSchemeColorExtended, poles[0], poles[1]);
        }
        return modifyLightSchemeColor(rgb, theme);
    }
    if (__PLUS__) {
        const poles = getTextPoles(theme);
        return modifyColorWithCache(rgb, theme, modifyFgColorExtended, poles[0], poles[1]);
    }
    const pole = getFgPole(theme);
    return modifyColorWithCache(rgb, theme, modifyFgHSL, pole);
}

export function modifyForegroundColor(rgb: RGBA, theme: Theme, shouldRegisterColorVariable = true): string {
    if (!shouldRegisterColorVariable) {
        return _modifyForegroundColor(rgb, theme);
    }
    return modifyAndRegisterColor('text', rgb, theme, _modifyForegroundColor);
}

function modifyBorderHSL({h, s, l, a}: HSLA, poleFg: HSLA, poleBg: HSLA): HSLA {
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

function _modifyBorderColor(rgb: RGBA, theme: Theme) {
    if (theme.mode === 0) {
        return modifyLightSchemeColor(rgb, theme);
    }
    const poleFg = getFgPole(theme);
    const poleBg = getBgPole(theme);
    return modifyColorWithCache(rgb, theme, modifyBorderHSL, poleFg, poleBg);
}

export function modifyBorderColor(rgb: RGBA, theme: Theme, shouldRegisterColorVariable = true): string {
    if (!shouldRegisterColorVariable) {
        return _modifyBorderColor(rgb, theme);
    }
    return modifyAndRegisterColor('border', rgb, theme, _modifyBorderColor);
}

export function modifyShadowColor(rgb: RGBA, theme: Theme): string {
    return modifyBackgroundColor(rgb, theme);
}

export function modifyGradientColor(rgb: RGBA, theme: Theme): string {
    return modifyBackgroundColor(rgb, theme);
}
