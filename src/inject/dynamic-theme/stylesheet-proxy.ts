declare const __FIREFOX_MV2__: boolean;
declare const __THUNDERBIRD__: boolean;

export function injectProxy(enableStyleSheetsProxy: boolean, enableCustomElementRegistryProxy: boolean): void {
    document.dispatchEvent(new CustomEvent('__darkreader__inlineScriptsAllowed'));

    const addRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'addRule');
    const insertRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'insertRule');
    const deleteRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'deleteRule');
    const removeRuleDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'removeRule');
    const replaceDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'replace');
    const replaceSyncDescriptor = Object.getOwnPropertyDescriptor(CSSStyleSheet.prototype, 'replaceSync');

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
        Object.defineProperty(CSSStyleSheet.prototype, 'replace', replaceDescriptor!);
        Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', replaceSyncDescriptor!);
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

    let onSheetChange: (sheet: CSSStyleSheet) => void;

    function proxyAddRule(selector?: string, style?: string, index?: number): number {
        addRuleDescriptor!.value.call(this, selector, style, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            onSheetChange(this);
        }
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    }

    function proxyInsertRule(rule: string, index?: number): number {
        const returnValue = insertRuleDescriptor!.value.call(this, rule, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            onSheetChange(this);
        }
        return returnValue;
    }

    function proxyDeleteRule(index: number): void {
        deleteRuleDescriptor!.value.call(this, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            onSheetChange(this);
        }
    }

    function proxyRemoveRule(index?: number): void {
        removeRuleDescriptor!.value.call(this, index);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            onSheetChange(this);
        }
    }

    function proxyReplace(cssText: string): Promise<CSSStyleSheet> {
        const returnValue = replaceDescriptor!.value.call(this, cssText);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader')) && returnValue && returnValue instanceof Promise) {
            returnValue.then(() => this.ownerNode.dispatchEvent(updateSheetEvent));
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            if (returnValue && returnValue instanceof Promise) {
                returnValue.then(() => onSheetChange(this));
            }
        }
        return returnValue;
    }

    function proxyReplaceSync(cssText: string): void {
        replaceSyncDescriptor!.value.call(this, cssText);
        if (this.ownerNode && !(this.ownerNode.classList && this.ownerNode.classList.contains('darkreader'))) {
            this.ownerNode.dispatchEvent(updateSheetEvent);
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            onSheetChange(this);
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

    Object.defineProperty(CSSStyleSheet.prototype, 'addRule', {...addRuleDescriptor, value: proxyAddRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'insertRule', {...insertRuleDescriptor, value: proxyInsertRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'deleteRule', {...deleteRuleDescriptor, value: proxyDeleteRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'removeRule', {...removeRuleDescriptor, value: proxyRemoveRule});
    Object.defineProperty(CSSStyleSheet.prototype, 'replace', {...replaceDescriptor, value: proxyReplace});
    Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {...replaceSyncDescriptor, value: proxyReplaceSync});
    if (enableStyleSheetsProxy) {
        Object.defineProperty(Document.prototype, 'styleSheets', {...documentStyleSheetsDescriptor, get: proxyDocumentStyleSheets});
    }
    if (enableCustomElementRegistryProxy) {
        Object.defineProperty(CustomElementRegistry.prototype, 'define', {...customElementRegistryDefineDescriptor, value: proxyCustomElementRegistryDefine});
    }
    if (shouldWrapHTMLElement) {
        Object.defineProperty(Element.prototype, 'getElementsByTagName', {...getElementsByTagNameDescriptor, value: proxyGetElementsByTagName});
    }
    if (shouldProxyChildNodes) {
        Object.defineProperty(Node.prototype, 'childNodes', {...childNodesDescriptor, get: proxyChildNodes});
    }

    if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
        type StyleSheetCommand = {
            type: 'insert' | 'delete' | 'replace';
            path: number[];
            cssText?: string;
        };
        const targetNodes = new Set<Document | ShadowRoot>();
        const sourceSheets = new WeakSet<CSSStyleSheet>();
        const sourceSheetNodes = new WeakMap<CSSStyleSheet, Document | ShadowRoot>();
        const overrideSheets = new WeakMap<Document | ShadowRoot, CSSStyleSheet>();

        let observableStyleDeclarations = new WeakMap<CSSStyleDeclaration, Document | ShadowRoot>();
        cleaners.push(() => observableStyleDeclarations = new WeakMap());

        let executing = false;

        let nodeCounter = 0;
        const nodeIds = new WeakMap<Document | ShadowRoot, number>();
        const nodesById = new Map<number, Document | ShadowRoot>();
        const getNodeId = (node: Document | ShadowRoot) => {
            if (nodeIds.has(node)) {
                return nodeIds.get(node)!;
            }
            const id = ++nodeCounter;
            nodeIds.set(node, id);
            nodesById.set(id, node);
            return id;
        };

        const cleanNode = (node: Document | ShadowRoot) => {
            targetNodes.delete(node);
            nodesById.delete(getNodeId(node));
            iterateSourceSheets(node, (sheet) => {
                sourceSheets.delete(sheet);
                sourceSheetNodes.delete(sheet);
            });
            const override = overrideSheets.get(node);
            if (override && Array.isArray(node.adoptedStyleSheets)) {
                const index = node.adoptedStyleSheets.indexOf(override);
                if (index >= 0) {
                    node.adoptedStyleSheets.splice(index, 1);
                }
            }
            overrideSheets.delete(node);
        };

        const iterateSourceSheets = (node: Document | ShadowRoot, iterator: (sheet: CSSStyleSheet) => void) => {
            if (Array.isArray(node.adoptedStyleSheets)) {
                node.adoptedStyleSheets.forEach((sheet) => {
                    const override = overrideSheets.get(node);
                    if (sheet !== override) {
                        if (!sourceSheets.has(sheet)) {
                            sourceSheets.add(sheet);
                        }
                        if (!sourceSheetNodes.has(sheet)) {
                            sourceSheetNodes.set(sheet, node);
                        }
                        iterator(sheet);
                    }
                });
            }
        };

        const getSourceCSSRules = (node: Document | ShadowRoot) => {
            const cssRules: CSSRule[] = [];
            iterateSourceSheets(node, (sheet) => {
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    const rule = sheet.cssRules[i];
                    cssRules.push(rule);
                    if ((rule as CSSStyleRule).style) {
                        observableStyleDeclarations.set((rule as CSSStyleRule).style, node);
                    }
                }
            });
            return cssRules;
        };

        const walkNodesWithAdoptedStyles = (root: Document | ShadowRoot, iterator: (host: Document | ShadowRoot) => void) => {
            iterator(root);
            const acceptNode = (node: Node) => (node as Element).shadowRoot == null ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_ACCEPT;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {acceptNode});
            const start = root === document ? walker.nextNode() : root;
            for (let node = start; node != null; node = walker.nextNode() as Element) {
                const shadowRoot = (node as Element).shadowRoot;
                if (shadowRoot) {
                    walkNodesWithAdoptedStyles(shadowRoot, iterator);
                }
            }
        };

        const queuedSheetChanges = new Set<Document | ShadowRoot>();

        const handleSheetChange = (node: Document | ShadowRoot) => {
            if (!node.isConnected) {
                cleanNode(node);
                return;
            }
            if (queuedSheetChanges.has(node)) {
                return;
            }
            if (!targetNodes.has(node)) {
                targetNodes.add(node);
            }
            queuedSheetChanges.add(node);
            queueMicrotask(() => {
                queuedSheetChanges.delete(node);
                const cssRules = getSourceCSSRules(node);
                sendSourceStyles(node, cssRules);
            });
        };

        const executeCommands = (node: Document | ShadowRoot, commands: StyleSheetCommand[]) => {
            executing = true;

            let sheet: CSSStyleSheet;
            if (overrideSheets.has(node)) {
                sheet = overrideSheets.get(node)!;
            } else {
                sheet = new CSSStyleSheet();
                overrideSheets.set(node, sheet);
            }

            commands.forEach((c) => {
                const {type, path, cssText} = c;
                let target: CSSStyleSheet | CSSGroupingRule = sheet;
                const pathLength = path.length - (type === 'replace' ? 0 : 1);
                for (let i = 0; i < pathLength; i++) {
                    target = target.cssRules[path[i]] as CSSGroupingRule;
                }
                const index = path.at(-1)!;
                if (type === 'insert') {
                    const cssText = c.cssText!;
                    target.insertRule(cssText, index);
                } else if (type === 'delete') {
                    target.deleteRule(index);
                } else if (type === 'replace') {
                    (target as CSSStyleSheet).replaceSync(cssText!);
                }
            });

            const overrideIndex = node.adoptedStyleSheets.indexOf(sheet);
            if (overrideIndex < 0) {
                node.adoptedStyleSheets.push(sheet);
            } else if (overrideIndex !== node.adoptedStyleSheets.length - 1) {
                node.adoptedStyleSheets.splice(overrideIndex, 1);
                node.adoptedStyleSheets.push(sheet);
            }

            executing = false;
        };

        const adoptedSheetsSourceProxies = new WeakMap<CSSStyleSheet[], CSSStyleSheet[]>();
        const adoptedSheetsProxySources = new WeakMap<CSSStyleSheet[], CSSStyleSheet[]>();

        const proxyArray = (node: Document | ShadowRoot, source: CSSStyleSheet[]) => {
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
                    if (property === 'length' && !executing) {
                        handleSheetChange(node);
                    }
                    return true;
                },
            });
            adoptedSheetsSourceProxies.set(source, proxy);
            adoptedSheetsProxySources.set(proxy, source);
            return proxy;
        };

        const proxyAdoptedStyleSheets = (proto: Document | ShadowRoot) => {
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
                    handleSheetChange(this);
                },
            });
            cleaners.push(() => Object.defineProperty(proto, 'adoptedStyleSheets', native));
        };

        const proxyStyleDeclaration = (property: keyof CSSStyleDeclaration) => {
            const proto = CSSStyleDeclaration.prototype;
            const native = Object.getOwnPropertyDescriptor(proto, property)!;
            Object.defineProperty(proto, property, {
                ...native,
                value(...args: any[]) {
                    const returnValue = native.value!.apply(this, args);
                    if (observableStyleDeclarations.has(this)) {
                        const node = observableStyleDeclarations.get(this)!;
                        if (!targetNodes.has(node)) {
                            observableStyleDeclarations.delete(this);
                            return;
                        }
                        handleSheetChange(node);
                    }
                    return returnValue;
                },
            });
            cleaners.push(() => Object.defineProperty(proto, property, native));
        };

        const sendSourceStyles = (node: Document | ShadowRoot, cssRules: CSSRule[]) => {
            const id = getNodeId(node);
            const data = {detail: {node, id, cssRules}};
            const event = new CustomEvent('__darkreader__adoptedStyleSheetsChange', data);
            document.dispatchEvent(event);
        };

        const sendSourceStylesBatch = (entries: Array<[Document | ShadowRoot, number, CSSRule[]]>) => {
            const data = {detail: {entries}};
            const event = new CustomEvent('__darkreader__adoptedStyleSheetsChange', data);
            document.dispatchEvent(event);
        };

        const commandsListener = (e: CustomEvent) => {
            const {id, commands} = JSON.parse(e.detail);
            const node = nodesById.get(id)!;
            executeCommands(node, commands);
        };

        onSheetChange = (sheet) => {
            if (sourceSheets.has(sheet)) {
                const node = sourceSheetNodes.get(sheet)!;
                handleSheetChange(node);
            }
        };

        const startAdoptedStylesProcessing = () => {
            proxyAdoptedStyleSheets(Document.prototype);
            proxyAdoptedStyleSheets(ShadowRoot.prototype);
            proxyStyleDeclaration('setProperty');
            proxyStyleDeclaration('removeProperty');

            document.addEventListener('__darkreader__adoptedStyleSheetCommands', commandsListener);
            cleaners.push(() => document.removeEventListener('__darkreader__adoptedStyleSheetCommands', commandsListener));

            walkNodesWithAdoptedStyles(document, (node) => targetNodes.add(node));
            cleaners.push(() => targetNodes.forEach((node) => cleanNode(node)));

            const entries: Array<[Document | ShadowRoot, number, CSSRule[]]> = [];
            targetNodes.forEach((node) => {
                const id = getNodeId(node);
                const rules = getSourceCSSRules(node);
                entries.push([node, id, rules]);
            });
            sendSourceStylesBatch(entries);
        };

        document.addEventListener('__darkreader__startAdoptedStyleSheetsWatcher', startAdoptedStylesProcessing);
        cleaners.push(() => document.removeEventListener('__darkreader__startAdoptedStyleSheetsWatcher', startAdoptedStylesProcessing));
    }
}
