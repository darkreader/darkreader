export function injectProxy() {
    document.dispatchEvent(new CustomEvent('__darkreader__inlineScriptsAllowed'));

    const addRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'addRule');
    const insertRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'insertRule');
    const deleteRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'deleteRule');
    const removeRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'removeRule');

    // TODO: Remove wrapper when the issue is resolved in Pushbullet.com
    const shouldWrapDocStyleSheets = location.hostname.endsWith('pushbullet.com') ||
        location.hostname.endsWith('ilsole24ore.com') ||
        location.hostname.endsWith('allegro.pl');
    const documentStyleSheetsDescriptor = shouldWrapDocStyleSheets ? Object.getOwnPropertyDescriptor(Document.prototype, 'styleSheets') : null;

    const cleanUp = () => {
        Object.defineProperty(CSSStyleSheet.prototype, 'addRule', addRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', insertRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', deleteRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', removeRuleDescriptor);
        document.removeEventListener('__darkreader__cleanUp', cleanUp);
        document.removeEventListener('__darkreader__addUndefinedResolver', addUndefinedResolver);
        if (shouldWrapDocStyleSheets) {
            Object.defineProperty(Document.prototype, 'styleSheets', documentStyleSheetsDescriptor);
        }
    };

    const addUndefinedResolver = (e: CustomEvent<{tag: string}>) => {
        customElements.whenDefined(e.detail.tag).then(() => {
            document.dispatchEvent(new CustomEvent('__darkreader__isDefined', {detail: {tag: e.detail.tag}}));
        });
    };

    document.addEventListener('__darkreader__cleanUp', cleanUp);
    document.addEventListener('__darkreader__addUndefinedResolver', addUndefinedResolver);

    const updateSheetEvent = new Event('__darkreader__updateSheet');

    function proxyAddRule(selector?: string, style?: string, index?: number): number {
        addRuleDescriptor.value.call(this, selector, style, index);
        if (this.ownerNode && !this.ownerNode.classList.contains('darkreader')) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    }

    function proxyInsertRule(rule: string, index?: number): number {
        const returnValue = insertRuleDescriptor.value.call(this, rule, index);
        if (this.ownerNode && !this.ownerNode.classList.contains('darkreader')) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        return returnValue;
    }

    function proxyDeleteRule(index: number): void {
        deleteRuleDescriptor.value.call(this, index);
        if (this.ownerNode && !this.ownerNode.classList.contains('darkreader')) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
    }

    function proxyRemoveRule(index?: number): void {
        removeRuleDescriptor.value.call(this, index);
        if (this.ownerNode && !this.ownerNode.classList.contains('darkreader')) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
    }

    function proxyDocumentStyleSheets() {
        const docSheets = documentStyleSheetsDescriptor.get.call(this);
        const filtered = [...docSheets].filter((styleSheet: CSSStyleSheet) => {
            return !(styleSheet.ownerNode as HTMLElement).classList.contains('darkreader');
        });
        return Object.setPrototypeOf(filtered, StyleSheetList.prototype);
    }

    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', Object.assign({}, addRuleDescriptor, {value: proxyAddRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', Object.assign({}, insertRuleDescriptor, {value: proxyInsertRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', Object.assign({}, deleteRuleDescriptor, {value: proxyDeleteRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', Object.assign({}, removeRuleDescriptor, {value: proxyRemoveRule}));
    if (shouldWrapDocStyleSheets) {
        Object.defineProperty(Document.prototype, 'styleSheets', Object.assign({}, documentStyleSheetsDescriptor, {get: proxyDocumentStyleSheets}));
    }
}
