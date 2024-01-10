declare const __FIREFOX_MV2__: boolean;
declare const __THUNDERBIRD__: boolean;

export function injectProxy(enableStyleSheetsProxy: boolean, enableCustomElementRegistryProxy: boolean): void {
    document.dispatchEvent(new CustomEvent('__darkreader__inlineScriptsAllowed'));

    const addRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'addRule');
    const insertRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'insertRule');
    const deleteRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'deleteRule');
    const removeRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'removeRule');

    const documentStyleSheetsDescriptor = enableStyleSheetsProxy ?
        Object.getOwnPropertyDescriptor(Document.prototype, 'styleSheets') : null;

    const customElementRegistryDefineDescriptor = enableCustomElementRegistryProxy ?
        Object.getOwnPropertyDescriptor(CustomElementRegistry.prototype, 'define') : null;

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

    // Reference:
    // https://github.com/darkreader/darkreader/issues/10300#issuecomment-1317445632
    const shouldProxyChildNodes = location.hostname === 'www.vy.no';

    const childNodesDescriptor = shouldProxyChildNodes ?
        Object.getOwnPropertyDescriptor(Node.prototype, 'childNodes') : null;

    const cleaners: Array<() => void> = [];

    const cleanUp = () => {
        Object.defineProperty(CSSStyleSheet.prototype, 'addRule', addRuleDescriptor!);
        Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', insertRuleDescriptor!);
        Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', deleteRuleDescriptor!);
        Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', removeRuleDescriptor!);
        document.removeEventListener('__darkreader__cleanUp', cleanUp);
        document.removeEventListener('__darkreader__addUndefinedResolver', addUndefinedResolver);
        document.removeEventListener('__darkreader__blobURLCheckRequest', checkBlobURLSupport);
        if (enableStyleSheetsProxy) {
            Object.defineProperty(Document.prototype, 'styleSheets', documentStyleSheetsDescriptor!);
        }
        if (enableCustomElementRegistryProxy) {
            Object.defineProperty(CustomElementRegistry.prototype, 'define', customElementRegistryDefineDescriptor!);
        }
        if (shouldWrapHTMLElement) {
            Object.defineProperty(Element.prototype, 'getElementsByTagName', getElementsByTagNameDescriptor!);
        }
        if (shouldProxyChildNodes) {
            Object.defineProperty(Node.prototype, 'childNodes', childNodesDescriptor!);
        }
        cleaners.forEach((clean) => clean());
        cleaners.splice(0);
    };

    const addUndefinedResolverInner = (tag: string) => {
        customElements.whenDefined(tag).then(() => {
            document.dispatchEvent(new CustomEvent('__darkreader__isDefined', {detail: {tag}}));
        });
    };

    const addUndefinedResolver = (e: CustomEvent<{tag: string}>) => addUndefinedResolverInner(e.detail.tag);

    document.addEventListener('__darkreader__cleanUp', cleanUp, {passive: true});
    document.addEventListener('__darkreader__addUndefinedResolver', addUndefinedResolver, {passive: true});
    document.addEventListener('__darkreader__blobURLCheckRequest', checkBlobURLSupport, {once: true});

    const updateSheetEvent = new Event('__darkreader__updateSheet');

    function proxyAddRule(selector?: string, style?: string, index?: number): number {
        addRuleDescriptor!.value.call(this, selector, style, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    }

    function proxyInsertRule(rule: string, index?: number): number {
        const returnValue = insertRuleDescriptor!.value.call(this, rule, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        return returnValue;
    }

    function proxyDeleteRule(index: number): void {
        deleteRuleDescriptor!.value.call(this, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
    }

    function proxyRemoveRule(index?: number): void {
        removeRuleDescriptor!.value.call(this, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
    }

    function proxyDocumentStyleSheets() {
        const getCurrentValue = () => {
            const docSheets: StyleSheetList = documentStyleSheetsDescriptor!.get!.call(this);

            const filteredSheets = [...docSheets].filter((styleSheet) =>
                styleSheet.ownerNode && !(
                    (styleSheet.ownerNode as Exclude<typeof styleSheet.ownerNode, ProcessingInstruction>).classList &&
                    (styleSheet.ownerNode as Exclude<typeof styleSheet.ownerNode, ProcessingInstruction>).classList.contains('darkreader')
                )
            );

            (filteredSheets as unknown as StyleSheetList).item = (item: number) => filteredSheets[item];

            return Object.setPrototypeOf(filteredSheets, StyleSheetList.prototype);
        };

        let elements = getCurrentValue();

        // Because StyleSheetList are so called "live objects".
        // Every time you access them, it will return all stylesheets from
        // current situation of the DOM. Instead of a static list.
        const styleSheetListBehavior: ProxyHandler<StyleSheetList> = {
            get: function (_: StyleSheetList, property: string) {
                return getCurrentValue()[property];
            },
        };
        elements = new Proxy(elements, styleSheetListBehavior);
        return elements;
    }

    function proxyCustomElementRegistryDefine(name: string, constructor: any, options: any) {
        addUndefinedResolverInner(name);
        customElementRegistryDefineDescriptor!.value.call(this, name, constructor, options);
    }

    function proxyGetElementsByTagName(tagName: string): NodeListOf<HTMLElement> {
        if (tagName !== 'style') {
            return getElementsByTagNameDescriptor!.value.call(this, tagName);
        }

        const getCurrentElementValue = () => {
            const elements: NodeListOf<HTMLElement> = getElementsByTagNameDescriptor!.value.call(this, tagName);

            return Object.setPrototypeOf([...elements].filter((element: HTMLElement) =>
                element && !(element.classList && element.classList.contains('darkreader'))
            ), NodeList.prototype);
        };

        let elements = getCurrentElementValue();
        // Don't ask just trust me.
        // Because NodeListOf and HTMLCollection are so called "live objects".
        // Every time you access them, it will return all tagnames from
        // current situation of the DOM. Instead of a static list.
        const nodeListBehavior: ProxyHandler<NodeListOf<HTMLElement>> = {
            get: function (_: NodeListOf<HTMLElement>, property: string) {
                return getCurrentElementValue()[Number(property) || property];
            },
        };
        elements = new Proxy(elements, nodeListBehavior);
        return elements;
    }

    function proxyChildNodes(): NodeListOf<ChildNode> {
        const childNodes: NodeListOf<ChildNode> = childNodesDescriptor!.get!.call(this);

        return Object.setPrototypeOf([...childNodes].filter((element: ChildNode) => {
            return !(element as HTMLElement).classList || !(element as HTMLElement).classList.contains('darkreader');
        }), NodeList.prototype);
    }

    async function checkBlobURLSupport(): Promise<void> {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="transparent"/></svg>';
        const bytes = new Uint8Array(svg.length);
        for (let i = 0; i < svg.length; i++) {
            bytes[i] = svg.charCodeAt(i);
        }
        const blob = new Blob([bytes], {type: 'image/svg+xml'});
        const objectURL = URL.createObjectURL(blob);
        let blobURLAllowed: boolean;
        try {
            const image = new Image();
            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject();
                image.src = objectURL;
            });
            blobURLAllowed = true;
        } catch (err) {
            blobURLAllowed = false;
        }
        document.dispatchEvent(new CustomEvent('__darkreader__blobURLCheckResponse', {detail: {blobURLAllowed}}));
    }

    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', Object.assign({}, addRuleDescriptor, {value: proxyAddRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', Object.assign({}, insertRuleDescriptor, {value: proxyInsertRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', Object.assign({}, deleteRuleDescriptor, {value: proxyDeleteRule}));
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', Object.assign({}, removeRuleDescriptor, {value: proxyRemoveRule}));
    if (enableStyleSheetsProxy) {
        Object.defineProperty(Document.prototype, 'styleSheets', Object.assign({}, documentStyleSheetsDescriptor, {get: proxyDocumentStyleSheets}));
    }
    if (enableCustomElementRegistryProxy) {
        Object.defineProperty(CustomElementRegistry.prototype, 'define', Object.assign({}, customElementRegistryDefineDescriptor, {value: proxyCustomElementRegistryDefine}));
    }
    if (shouldWrapHTMLElement) {
        Object.defineProperty(Element.prototype, 'getElementsByTagName', Object.assign({}, getElementsByTagNameDescriptor, {value: proxyGetElementsByTagName}));
    }
    if (shouldProxyChildNodes) {
        Object.defineProperty(Node.prototype, 'childNodes', Object.assign({}, childNodesDescriptor, {get: proxyChildNodes}));
    }

    if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
        const potentialAdoptedStyleNodes = new Map<Document | ShadowRoot, number>();

        function iterateAdoptedStyleSheets(node: Document | ShadowRoot, iterator: (sheet: CSSStyleSheet) => void) {
            if (Array.isArray(node.adoptedStyleSheets)) {
                node.adoptedStyleSheets.forEach(iterator);
            }
        }

        function getAdoptedStyleChangeKey(node: Document | ShadowRoot) {
            let count = 0;
            iterateAdoptedStyleSheets(node, (sheet) => {
                count += sheet.cssRules.length;
            });
            if (count === 1) {
                // MS Copilot issue, where there is an empty `:root {}` style at the beginning.
                // Counting all the rules for all the shadow DOM elements can be expensive.
                const rule = node.adoptedStyleSheets[0].cssRules[0];
                return rule instanceof CSSStyleRule ? rule.style.length : count;
            }
            return count;
        }

        function getAdoptedCSSRules(node: Document | ShadowRoot) {
            const cssRules: CSSRule[] = [];
            iterateAdoptedStyleSheets(node, (sheet) => {
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    const rule = sheet.cssRules[i];
                    cssRules.push(rule);
                }
            });
            return cssRules;
        }

        function sendAdoptedStyles(node: Document | ShadowRoot, cssRules: CSSRule[]) {
            const data = {detail: {node, cssRules}};
            const event = new CustomEvent('__darkreader__adoptedStyleSheetsChange', data);
            document.dispatchEvent(event);
        }

        function sendAdoptedStylesBatch(entries: Array<[Document | ShadowRoot, CSSRule[]]>) {
            const data = {detail: {entries}};
            const event = new CustomEvent('__darkreader__adoptedStyleSheetsChange', data);
            document.dispatchEvent(event);
        }

        let watcherFrameId = 0;

        function handleAdoptedCSSChange(node: Document | ShadowRoot) {
            if (!node.isConnected) {
                potentialAdoptedStyleNodes.delete(node);
                return;
            }
            const newKey = getAdoptedStyleChangeKey(node);
            if (potentialAdoptedStyleNodes.has(node)) {
                const key = potentialAdoptedStyleNodes.get(node);
                if (newKey === key) {
                    return;
                }
            }
            potentialAdoptedStyleNodes.set(node, newKey);
            const cssRules = getAdoptedCSSRules(node);
            sendAdoptedStyles(node, cssRules);
        }

        function watchAdoptedStyles() {
            potentialAdoptedStyleNodes.forEach((_key, node) => {
                handleAdoptedCSSChange(node);
            });
            watcherFrameId = requestAnimationFrame(watchAdoptedStyles);
        }

        function iterateShadowHosts(root: Node | null, iterator: (host: Element) => void) {
            if (root == null) {
                return;
            }
            const acceptNode = (node: Node) => (node as Element).shadowRoot == null ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {acceptNode});
            for (
                let node = ((root as Element).shadowRoot ? walker.currentNode : walker.nextNode()) as Element;
                node != null;
                node = walker.nextNode() as Element
            ) {
                iterator(node);
                iterateShadowHosts(node.shadowRoot, iterator);
            }
        }

        function stopWatchingForAdoptedStyles() {
            if (watcherFrameId) {
                cancelAnimationFrame(watcherFrameId);
                watcherFrameId = 0;
            }
        }

        const adoptedSheetsSourceProxies = new WeakMap<CSSStyleSheet[], CSSStyleSheet[]>();
        const adoptedSheetsProxySources = new WeakMap<CSSStyleSheet[], CSSStyleSheet[]>();

        function proxyArray(node: Document | ShadowRoot, source: CSSStyleSheet[]) {
            if (adoptedSheetsProxySources.has(source)) {
                return source;
            }
            if (adoptedSheetsSourceProxies.has(source)) {
                return adoptedSheetsSourceProxies.get(source)!;
            }
            const proxy = new Proxy(source, {
                deleteProperty(target, property) {
                    delete target[property as any];
                    return true;
                },
                set(target, property, value) {
                    target[property as any] = value;
                    if (property === 'length') {
                        handleAdoptedCSSChange(node);
                    }
                    return true;
                },
            });
            adoptedSheetsSourceProxies.set(source, proxy);
            adoptedSheetsProxySources.set(proxy, source);
            return proxy;
        }

        function overwriteAdoptedStyleSheetsProp(proto: Document | ShadowRoot) {
            const native = Object.getOwnPropertyDescriptor(proto, 'adoptedStyleSheets')!;
            Object.defineProperty(proto, 'adoptedStyleSheets', {
                ...native,
                get() {
                    const source = native.get!.call(this) as CSSStyleSheet[];
                    return proxyArray(this, source);
                },
                set(source) {
                    if (adoptedSheetsProxySources.has(source)) {
                        source = adoptedSheetsProxySources.get(source);
                    }
                    native.set!.call(this, source);
                    handleAdoptedCSSChange(this);
                },
            });
            cleaners.push(() => Object.defineProperty(proto, 'adoptedStyleSheets', native));
        }

        function startAdoptedStylesProcessing() {
            const entries: Array<[Document | ShadowRoot, CSSRule[]]> = [];
            entries.push([document, getAdoptedCSSRules(document)]);
            iterateShadowHosts(document.documentElement, (host) => {
                const shadowRoot = host.shadowRoot;
                if (shadowRoot) {
                    entries.push([shadowRoot, getAdoptedCSSRules(shadowRoot)]);
                }
            });
            sendAdoptedStylesBatch(entries);
            entries.forEach(([node]) => {
                potentialAdoptedStyleNodes.set(node, getAdoptedStyleChangeKey(node));
            });

            overwriteAdoptedStyleSheetsProp(Document.prototype);
            overwriteAdoptedStyleSheetsProp(ShadowRoot.prototype);

            watchAdoptedStyles();
            cleaners.push(stopWatchingForAdoptedStyles);
        }

        document.addEventListener('__darkreader__startAdoptedStyleSheetsWatcher', () => {
            startAdoptedStylesProcessing();
        });
    }
}
