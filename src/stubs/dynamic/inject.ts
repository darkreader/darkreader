interface StaticStyleInjector {
    begin(): void;
    inject(id: string, text: string, position: 'beginning' | 'ending', callback?: () => void): CSSStyleSheet;
}

export function createExtendedStaticStyleInjector(_root: Document | ShadowRoot): StaticStyleInjector {
    return null as any;
}

export function reuseStaticStyleOverrides(_root: ShadowRoot) {
}

export function removeExtendedFallback() {
}

export function removeExtendedStaticOverrides() {
}

export function prepareExtendedOverrideSheet(_sourceStyle: HTMLStyleElement | SVGStyleElement): CSSStyleSheet {
    return null as any;
}

export function removeExtendedOverrideSheet(_sourceStyle: HTMLStyleElement | SVGStyleElement) {
}

export function setInlineStyleValue(_element: Element, _attr: string, _srcProp: string, _overrideProp: string, _srcValue: string, _overrideValue: string) {
}
