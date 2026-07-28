import type {Theme} from 'definitions';
import type {HSLA} from 'utils/color';
import {writeLocalStorage} from 'background/utils/extension-api';
import uiHighlights from 'background/ui-highlights';

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

export async function activateTheme(email: string, key: string): Promise<boolean> {
    if (email.includes('@') && key.trim()) {
        await writeLocalStorage({activationEmail: email, activationKey: key});
        await uiHighlights.hideHighlights(['anniversary']);
        return true;
    }
    return false;
}

export function extendThemeCacheKeys(_keys: Array<keyof Theme>) {
}
