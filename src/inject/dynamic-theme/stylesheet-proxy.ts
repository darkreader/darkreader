export function injectProxy(enableStyleSheetsProxy: boolean) {
    document.dispatchEvent(new CustomEvent('__darkreader__inlineScriptsAllowed'));

    const addRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'addRule');
    const insertRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'insertRule');
    const deleteRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'deleteRule');
    const removeRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'removeRule');

    const documentStyleSheetsDescriptor = enableStyleSheetsProxy ?
        Object.getOwnPropertyDescriptor(Document.prototype, 'styleSheets') : null;

    // Reference:
    // https://github.com/darkreader/darkreader/issues/6480#issuecomment-897696175
    const shouldWrapHTMLElement = [
        'baidu.com',
        'baike.baidu.com',
        'ditu.baidu.com',
        'map.baidu.com',
        'maps.baidu.com',
        'haokan.baidu.com',
        'pan.baidu.com',
        'passport.baidu.com',
        'tieba.baidu.com',
        'www.baidu.com'].includes(location.hostname);

    const getElementsByTagNameDescriptor = shouldWrapHTMLElement ?
        Object.getOwnPropertyDescriptor(Element.prototype, 'getElementsByTagName') : null;

    const cleanUp = () => {
        Object.defineProperty(CSSStyleSheet.prototype, 'addRule', addRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', insertRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', deleteRuleDescriptor);
        Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', removeRuleDescriptor);
        document.removeEventListener('__darkreader__cleanUp', cleanUp);
        document.removeEventListener('__darkreader__addUndefinedResolver', addUndefinedResolver);
        if (enableStyleSheetsProxy) {
            Object.defineProperty(Document.prototype, 'styleSheets', documentStyleSheetsDescriptor);
        }
        if (shouldWrapHTMLElement) {
            Object.defineProperty(Element.prototype, 'getElementsByTagName', getElementsByTagNameDescriptor);
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
        const getCurrentValue = () => {
            const docSheets = documentStyleSheetsDescriptor.get.call(this);

            const filteredSheets = [...docSheets].filter((styleSheet: CSSStyleSheet) => {
                return !(styleSheet.ownerNode as HTMLElement).classList.contains('darkreader');
            });

            (filteredSheets as any).item = (item: number) => {
                return filteredSheets[item];
            };

            return Object.setPrototypeOf(filteredSheets, StyleSheetList.prototype);
        };

        let elements = getCurrentValue();

        // Because StyleSheetList are so called "live objects".
        // Every time you access them, it will return all stylesheets from
        // current situation of the DOM. Instead of a static list.
        const styleSheetListBehavior: ProxyHandler<StyleSheetList> = {
            get: function (_: StyleSheetList, property: string) {
                return getCurrentValue()[property];
            }
        };
        elements = new Proxy(elements, styleSheetListBehavior);
        return elements;
    }

    function proxyGetElementsByTagName(tagName: string): NodeListOf<HTMLElement> {
        if (tagName !== 'style') {
            return getElementsByTagNameDescriptor.value.call(this, tagName);
        }

        const getCurrentElementValue = () => {
            const elements: NodeListOf<HTMLElement> = getElementsByTagNameDescriptor.value.call(this, tagName);

            return Object.setPrototypeOf([...elements].filter((element: HTMLElement) => {
                return !element.classList.contains('darkreader');
            }), NodeList.prototype);
        };

        let elements = getCurrentElementValue();
        // Don't ask just trust me.
        // Because NodeListOf and HTMLCollection are so called "live objects".
        // Every time you access them, it will return all tagnames from
        // current situation of the DOM. Instead of a static list.
        const nodeListBehavior: ProxyHandler<NodeListOf<HTMLElement>> = {
            get: function (_: NodeListOf<HTMLElement>, property: string) {
                return getCurrentElementValue()[Number(property) || property];
            }
        };
        elements = new Proxy(elements, nodeListBehavior);
        return elements;
    }

    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', Object.assign({}, addRuleDescriptor, {value: proxyAddRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', Object.assign({}, insertRuleDescriptor, {value: proxyInsertRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', Object.assign({}, deleteRuleDescriptor, {value: proxyDeleteRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', Object.assign({}, removeRuleDescriptor, {value: proxyRemoveRule}));
    if (enableStyleSheetsProxy) {
        Object.defineProperty(Document.prototype, 'styleSheets', Object.assign({}, documentStyleSheetsDescriptor, {get: proxyDocumentStyleSheets}));
    }
    if (shouldWrapHTMLElement) {
        Object.defineProperty(Element.prototype, 'getElementsByTagName', Object.assign({}, getElementsByTagNameDescriptor, {value: proxyGetElementsByTagName}));
    }
}
