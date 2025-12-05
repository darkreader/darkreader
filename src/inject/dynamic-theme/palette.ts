import {parseColorWithCache, rgbToHexString, type RGBA} from '../../utils/color';

interface RegisteredColor {
    parsed: RGBA;
    background?: {
        value: string;
        variable: string;
    };
    text?: {
        value: string;
        variable: string;
    };
    border?: {
        value: string;
        variable: string;
    };
}

type ColorType = 'background' | 'border' | 'text';

interface ColorPalette {
    background: RGBA[];
    border: RGBA[];
    text: RGBA[];
}

let variablesSheet: CSSStyleSheet | null;

const registeredColors = new Map<string, RegisteredColor>();

export function registerVariablesSheet(sheet: CSSStyleSheet): void {
    variablesSheet = sheet;
    const types: ColorType[] = ['background', 'text', 'border'];
    registeredColors.forEach((registered) => {
        types.forEach((type) => {
            if (registered[type]) {
                const {variable, value} = registered[type];
                (variablesSheet?.cssRules[0] as CSSStyleRule).style.setProperty(variable, value);
            }
        });
    });
}

export function releaseVariablesSheet(): void {
    variablesSheet = null;
    clearColorPalette();
}

function getRegisteredVariableValue(type: ColorType, registered: RegisteredColor) {
    return `var(${registered[type]!.variable}, ${registered[type]!.value})`;
}

export function getRegisteredColor(type: ColorType, parsed: RGBA): string | null {
    const hex = rgbToHexString(parsed);
    const registered = registeredColors.get(hex);
    if (registered?.[type]) {
        return getRegisteredVariableValue(type, registered);
    }
    return null;
}

export function registerColor(type: ColorType, parsed: RGBA, value: string): string {
    const hex = rgbToHexString(parsed);

    let registered: RegisteredColor;
    if (registeredColors.has(hex)) {
        registered = registeredColors.get(hex)!;
    } else {
        const parsed = parseColorWithCache(hex)!;
        registered = {parsed};
        registeredColors.set(hex, registered);
    }

    const variable = `--darkreader-${type}-${hex.replace('#', '')}`;
    registered[type] = {variable, value};
    if ((variablesSheet?.cssRules[0] as CSSStyleRule)?.style) {
        (variablesSheet?.cssRules[0] as CSSStyleRule).style.setProperty(variable, value);
    }

    return getRegisteredVariableValue(type, registered);
}

export function getColorPalette(): ColorPalette {
    const background: RGBA[] = [];
    const border: RGBA[] = [];
    const text: RGBA[] = [];

    registeredColors.forEach((registered) => {
        if (registered.background) {
            background.push(registered.parsed);
        }
        if (registered.border) {
            border.push(registered.parsed);
        }
        if (registered.text) {
            text.push(registered.parsed);
        }
    });

    return {background, border, text};
}

export function clearColorPalette(): void {
    registeredColors.clear();
}
