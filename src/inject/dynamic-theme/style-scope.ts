const sheetsScopes = new WeakMap<CSSStyleSheet, Document | ShadowRoot>();

export function defineSheetScope(sheet: CSSStyleSheet, node: Document | ShadowRoot): void {
    sheetsScopes.set(sheet, node);
}

export function getSheetScope(sheet: CSSStyleSheet): Document | ShadowRoot | null {
    if (!sheet.ownerNode) {
        return null;
    }
    if (sheetsScopes.has(sheet)) {
        return sheetsScopes.get(sheet)!;
    }
    let node: Node | null = sheet.ownerNode;
    while (node) {
        if (node instanceof ShadowRoot || node instanceof Document) {
            defineSheetScope(sheet, node);
            return node;
        }
        node = node.parentNode;
    }
    return null;
}
