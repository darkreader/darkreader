import {FilterConfig} from '../../definitions';

const adoptedSheetOverride = new WeakMap<CSSStyleSheet, CSSStyleSheet>();

export function createSheetOverride(sheet: CSSStyleSheet): CSSStyleSheet {
    if (adoptedSheetOverride.has(sheet)) {
        return adoptedSheetOverride.get(sheet);
    }
    let override = new CSSStyleSheet();

    const cssRules = sheet.cssRules;

    adoptedSheetOverride.set(sheet, override);
    return override;
}



export interface AdoptedStyleManger {
    details(): {variables: Map<string, string>};
    render(filter: FilterConfig, variables: Map<string, string>): void;
    pause(): void;
    destroy(): void;
    watch(): void;
    restore(): void;
}