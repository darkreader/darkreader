import type {Theme} from 'definitions';
import type {HSLA} from 'utils/color';

export function getBackgroundPoles(_theme: Theme): [string, string] {
    return ['', ''];
}

export function getTextPoles(_theme: Theme): [string, string] {
    return ['', ''];
}

export function modifyBgColorExtended({h, s, l, a}: HSLA, _pole1: HSLA, _pole2: HSLA): HSLA {
    return {h, s, l, a};
}

export function modifyFgColorExtended({h, s, l, a}: HSLA, _pole1: HSLA, _pole2: HSLA): HSLA {
    return {h, s, l, a};
}

export function modifyLightSchemeColorExtended({h, s, l, a}: HSLA, _pole1: HSLA, _pole2: HSLA): HSLA {
    return {h, s, l, a};
}

export function activateTheme(_p1: string, _p2: string): Promise<boolean> {
    return new Promise((resolve) => resolve(false));
}

export function extendThemeCacheKeys(_keys: Array<keyof Theme>) {
}
