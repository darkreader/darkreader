interface StaticStyleInjector {
    begin(): void;
    inject(id: string, text: string, position: 'beginning' | 'ending', callback?: () => void): CSSStyleSheet;
}

export function createExtendedStaticStyleInjector(_root: Document | ShadowRoot): StaticStyleInjector {
    return null as any;
}

export function reuseStaticStyleOverrides(_injector: StaticStyleInjector, _root: ShadowRoot) {
}

export function removeExtendedFallback() {
}

export function removeExtendedStaticOverrides(_injector: StaticStyleInjector) {
}

export function prepareExtendedOverrideSheet(_sourceStyle: HTMLStyleElement | SVGStyleElement): CSSStyleSheet {
    return null as any;
}

export function removeExtendedOverrideSheet(_sourceStyle: HTMLStyleElement | SVGStyleElement) {
}
