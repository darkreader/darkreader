import {parseColorWithCache, rgbToHexString, type RGBA} from '../../utils/color';

interface RegisteredColor {
    source: string;
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

type ColorType = 'background' | 'text' | 'border';

let variablesSheet: CSSStyleSheet | null;

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
}

const registeredColors = new Map<string, RegisteredColor>();

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
        registered = {source: hex, parsed};
        registeredColors.set(hex, registered);
    }

    if (!registered[type]) {
        const variable = `--darkreader-${type}-${hex.replace('#', '')}`;
        registered[type] = {variable, value};
        if ((variablesSheet?.cssRules[0] as CSSStyleRule)?.style) {
            (variablesSheet?.cssRules[0] as CSSStyleRule).style.setProperty(variable, value);
        }
    }

    return getRegisteredVariableValue(type, registered);
}
