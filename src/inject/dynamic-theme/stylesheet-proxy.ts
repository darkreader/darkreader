declare const __FIREFOX_MV2__: boolean;
declare const __THUNDERBIRD__: boolean;

type OverrideFactory<T, P extends keyof T> = (native: T[P] & ((...args: any[]) => any)) => (this: T, ...args: Parameters<typeof native>) => ReturnType<typeof native>;

export function injectProxy(enableStyleSheetsProxy: boolean, enableCustomElementRegistryProxy: boolean): void {
    document.dispatchEvent(new CustomEvent('__darkreader__inlineScriptsAllowed'));

    const cleaners: Array<() => void> = [];

    function cleanUp() {
        cleaners.forEach((clean) => clean());
        cleaners.splice(0);
    }

    function documentEventListener(type: string, listener: (e: CustomEvent) => void, options?: AddEventListenerOptions) {
        document.addEventListener(type, listener, options);
        cleaners.push(() => document.removeEventListener(type, listener));
    }

    function disableConflictingPlugins() {
        const disableWPDarkMode = () => {
            if ((window as any)?.WPDarkMode?.deactivate) {
                (window as any).WPDarkMode.deactivate();
            }
        };
        disableWPDarkMode();
    }

    documentEventListener('__darkreader__cleanUp', cleanUp);
    documentEventListener('__darkreader__disableConflictingPlugins', disableConflictingPlugins);

    function overrideProperty<T, P extends keyof T>(cls: {prototype: T}, prop: P, overrides: Record<string, OverrideFactory<T, P>>) {
        const proto = cls.prototype;
        const oldDescriptor = Object.getOwnPropertyDescriptor(proto, prop);
        if (!oldDescriptor) {
            return;
        }
        const newDescriptor: PropertyDescriptor = {...oldDescriptor};
        Object.keys(overrides).forEach((key: keyof PropertyDescriptor) => {
            const factory = overrides[key];
            newDescriptor[key] = factory(oldDescriptor[key]);
        });
        Object.defineProperty(proto, prop, newDescriptor);
        cleaners.push(() => Object.defineProperty(proto, prop, oldDescriptor));
    }

    function override<T, P extends keyof T>(cls: {prototype: T}, prop: P, factory: OverrideFactory<T, P>) {
        overrideProperty(cls, prop, {value: factory});
    }

    function isDRElement(element?: Element) {
        return element?.classList?.contains('darkreader');
    }

    function isDRSheet(sheet: CSSStyleSheet) {
        return isDRElement(sheet.ownerNode as Element);
    }

    const updateSheetEvent = new CustomEvent('__darkreader__updateSheet');
    const adoptedSheetChangeEvent = new CustomEvent('__darkreader__adoptedStyleSheetChange');
    const shadowDomAttachingEvent = new CustomEvent('__darkreader__shadowDomAttaching', {bubbles: true});
    const adoptedSheetOwners = new WeakMap<CSSStyleSheet, Set<Document | ShadowRoot>>();
    const adoptedDeclarationSheets = new WeakMap<CSSStyleDeclaration, CSSStyleSheet>();
    let onFFSheetChange: (sheet: CSSStyleSheet) => void;

    function onAdoptedSheetChange(sheet: CSSStyleSheet) {
        const owners = adoptedSheetOwners.get(sheet);
        owners?.forEach((node) => {
            if (node.isConnected) {
                node.dispatchEvent(adoptedSheetChangeEvent);
            } else {
                owners.delete(node);
            }
        });
    }

    function reportSheetChange(sheet: CSSStyleSheet) {
        if (sheet.ownerNode && !isDRSheet(sheet)) {
            sheet.ownerNode.dispatchEvent(updateSheetEvent);
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            onFFSheetChange(sheet);
        } else if (adoptedSheetOwners.has(sheet)) {
            onAdoptedSheetChange(sheet);
        }
    }

    function reportSheetChangeAsync(sheet: CSSStyleSheet, promise: Promise<any>) {
        const {ownerNode} = sheet;
        if (ownerNode && !isDRSheet(sheet) && promise && promise instanceof Promise) {
            promise.then(() => ownerNode.dispatchEvent(updateSheetEvent));
        }
        if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
            if (promise && promise instanceof Promise) {
                promise.then(() => onFFSheetChange(sheet));
            }
        } else if (adoptedSheetOwners.has(sheet)) {
            if (promise && promise instanceof Promise) {
                promise.then(() => onAdoptedSheetChange(sheet));
            }
        }
    }

    override(CSSStyleSheet, 'addRule', (native) => function (selector?: string, style?: string, index?: number) {
        native.call(this, selector, style, index);
        reportSheetChange(this);
        // Should always returns -1 https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/addRule#Return_value.
        return -1;
    });

    override(CSSStyleSheet, 'insertRule', (native) => function (rule: string, index?: number) {
        const returnValue = native.call(this, rule, index) as number;
        reportSheetChange(this);
        return returnValue;
    });

    override(CSSStyleSheet, 'deleteRule', (native) => function (index: number) {
        native.call(this, index);
        reportSheetChange(this);
    });

    override(CSSStyleSheet, 'removeRule', (native) => function (index?: number) {
        native.call(this, index);
        reportSheetChange(this);
    });

    override(CSSStyleSheet, 'replace', (native) => function (cssText: string) {
        const returnValue = native.call(this, cssText);
        reportSheetChangeAsync(this, returnValue);
        return returnValue;
    });

    override(CSSStyleSheet, 'replaceSync', (native) => function (cssText: string) {
        native.call(this, cssText);
        reportSheetChange(this);
    });

    override(Element, 'attachShadow', (native) => function (options: any) {
        this.dispatchEvent(shadowDomAttachingEvent);
        return native.call(this, options);
    });

    // Reference:
    // https://github.com/darkreader/darkreader/issues/6480#issuecomment-897696175
    const shouldWrapHTMLElement = location.hostname === 'baidu.com' || location.hostname.endsWith('.baidu.com');
    if (shouldWrapHTMLElement) {
        override(Element, 'getElementsByTagName', (native) => function (tagName: string): NodeListOf<HTMLElement> {
            if (tagName !== 'style') {
                return native.call(this, tagName);
            }

            const getCurrentElementValue = () => {
                const elements: NodeListOf<HTMLElement> = native.call(this, tagName);

                return Object.setPrototypeOf([...elements].filter((element: HTMLElement) =>
                    element && !isDRElement(element)
                ), NodeList.prototype);
            };

            let elements = getCurrentElementValue();
            const nodeListBehavior: ProxyHandler<NodeListOf<HTMLElement>> = {
                get: function (_: NodeListOf<HTMLElement>, property: string) {
                    return getCurrentElementValue()[Number(property) || property];
                },
            };
            elements = new Proxy(elements, nodeListBehavior);
            return elements;
        });
    }

    // Reference:
    // https://github.com/darkreader/darkreader/issues/10300#issuecomment-1317445632
    const shouldProxyChildNodes = [
        'brilliant.org',
        'www.vy.no',
    ].includes(location.hostname);
    if (shouldProxyChildNodes) {
        overrideProperty(Node, 'childNodes', {
            get: (native) => function (): NodeListOf<ChildNode> {
                const childNodes: NodeListOf<ChildNode> = native.call(this);
                return Object.setPrototypeOf([...childNodes].filter((element: ChildNode) => {
                    return !isDRElement(element as Element);
                }), NodeList.prototype);
            },
        });
    }

    function resolveCustomElement(tag: string) {
        customElements.whenDefined(tag).then(() => {
            document.dispatchEvent(new CustomEvent('__darkreader__isDefined', {detail: {tag}}));
        });
    }

    documentEventListener('__darkreader__addUndefinedResolver', (e: CustomEvent<{tag: string}>) => resolveCustomElement(e.detail.tag));

    if (enableCustomElementRegistryProxy) {
        override(CustomElementRegistry, 'define', (native) => function (name: string, constructor: any, options: any) {
            resolveCustomElement(name);
            native.call(this, name, constructor, options);
        });
    }

    let blobURLAllowed: boolean | null = null;

    function checkBlobURLSupport() {
        if (blobURLAllowed != null) {
            document.dispatchEvent(new CustomEvent('__darkreader__blobURLCheckResponse', {detail: {blobURLAllowed}}));
            return;
        }

        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="transparent"/></svg>';
        const bytes = new Uint8Array(svg.length);
        for (let i = 0; i < svg.length; i++) {
            bytes[i] = svg.charCodeAt(i);
        }
        const blob = new Blob([bytes], {type: 'image/svg+xml'});
        const objectURL = URL.createObjectURL(blob);
        const image = new Image();
        image.onload = () => {
            blobURLAllowed = true;
            sendBlobURLCheckResponse();
        };
        image.onerror = () => {
            blobURLAllowed = false;
            sendBlobURLCheckResponse();
        };
        image.src = objectURL;
    }

    function sendBlobURLCheckResponse() {
        document.dispatchEvent(new CustomEvent('__darkreader__blobURLCheckResponse', {detail: {blobURLAllowed}}));
    }

    documentEventListener('__darkreader__blobURLCheckRequest', checkBlobURLSupport);

    if (enableStyleSheetsProxy) {
        overrideProperty(Document, 'styleSheets', {
            get: (native) => function () {
                const getCurrentValue = () => {
                    const docSheets: StyleSheetList = native.call(this);
                    const filteredSheets = [...docSheets].filter((styleSheet) => styleSheet.ownerNode && !isDRSheet(styleSheet));
                    (filteredSheets as unknown as StyleSheetList).item = (item: number) => filteredSheets[item];
                    return Object.setPrototypeOf(filteredSheets, StyleSheetList.prototype);
                };

                let elements = getCurrentValue();
                const styleSheetListBehavior: ProxyHandler<StyleSheetList> = {
                    get: function (_: StyleSheetList, property: string) {
                        return getCurrentValue()[property];
                    },
                };
                elements = new Proxy(elements, styleSheetListBehavior);
                return elements;
            },
        });
    }

    if (!(__FIREFOX_MV2__ || __THUNDERBIRD__)) {
        const adoptedSheetsSourceProxies = new WeakMap<CSSStyleSheet[], CSSStyleSheet[]>();
        const adoptedSheetsProxySources = new WeakMap<CSSStyleSheet[], CSSStyleSheet[]>();
        const adoptedSheetsChangeEvent = new CustomEvent('__darkreader__adoptedStyleSheetsChange');
        const adoptedSheetOverrideCache = new WeakSet<CSSStyleSheet>();
        const adoptedSheetsSnapshots = new WeakMap<Document | ShadowRoot, CSSStyleSheet[]>();

        const isDRAdoptedSheetOverride = (sheet: CSSStyleSheet) => {
            if (!sheet || !sheet.cssRules) {
                return false;
            }
            if (adoptedSheetOverrideCache.has(sheet)) {
                return true;
            }
            if (sheet.cssRules.length > 0 && sheet.cssRules[0].cssText.startsWith('#__darkreader__adoptedOverride')) {
                adoptedSheetOverrideCache.add(sheet);
                return true;
            }
            return false;
        };

        const areArraysEqual = (a: any[], b: any[]) => {
            return a.length === b.length && a.every((x, i) => x === b[i]);
        };

        const onAdoptedSheetsChange = (node: Document | ShadowRoot) => {
            const prev = adoptedSheetsSnapshots.get(node);
            const curr = (node.adoptedStyleSheets || []).filter((s) => !isDRAdoptedSheetOverride(s));
            adoptedSheetsSnapshots.set(node, curr);
            if (!prev || !areArraysEqual(prev, curr)) {
                curr.forEach((sheet) => {
                    if (!adoptedSheetOwners.has(sheet)) {
                        adoptedSheetOwners.set(sheet, new Set());
                    }
                    adoptedSheetOwners.get(sheet)!.add(node);
                    for (const rule of sheet.cssRules) {
                        const declaration = (rule as CSSStyleRule).style;
                        if (declaration) {
                            adoptedDeclarationSheets.set(declaration, sheet);
                        }
                    }
                });
                node.dispatchEvent(adoptedSheetsChangeEvent);
            }
        };

        const proxyAdoptedSheetsArray = (node: Document | ShadowRoot, source: CSSStyleSheet[]) => {
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
                        onAdoptedSheetsChange(node);
                    }
                    return true;
                },
            });
            adoptedSheetsSourceProxies.set(source, proxy);
            adoptedSheetsProxySources.set(proxy, source);
            return proxy;
        };

        [Document, ShadowRoot].forEach((ctor: {prototype: Document | ShadowRoot}) => {
            overrideProperty(ctor, 'adoptedStyleSheets', {
                get: (native) => function () {
                    const source = native.call(this) as CSSStyleSheet[];
                    return proxyAdoptedSheetsArray(this, source);
                },
                set: (native) => function (source) {
                    if (adoptedSheetsProxySources.has(source)) {
                        source = adoptedSheetsProxySources.get(source);
                    }
                    native.call(this, source);
                    onAdoptedSheetsChange(this);
                },
            });
        });

        const adoptedDeclarationChangeEvent = new CustomEvent('__darkreader__adoptedStyleDeclarationChange');
        (['setProperty', 'removeProperty'] as Array<keyof CSSStyleDeclaration>).forEach((key) => {
            override(CSSStyleDeclaration, key, (native) => {
                return function (...args: any[]) {
                    const returnValue = native.apply(this, args);
                    const sheet = adoptedDeclarationSheets.get(this);
                    if (sheet) {
                        const owners = adoptedSheetOwners.get(sheet);
                        if (owners) {
                            owners.forEach((node) => {
                                node.dispatchEvent(adoptedDeclarationChangeEvent);
                            });
                        }
                    }
                    return returnValue;
                };
            });
        });
    }

    if (__FIREFOX_MV2__ || __THUNDERBIRD__) {
        type StyleSheetCommand = {
            type: 'insert' | 'delete' | 'replace';
            path: number[];
            cssText?: string;
        };
        type NodeSheet = {
            sheetId: number;
            sheet: CSSStyleSheet;
        };

        const targetNodes = new Set<Document | ShadowRoot>();
        const sourceSheets = new WeakSet<CSSStyleSheet>();
        const sourceSheetNodes = new WeakMap<CSSStyleSheet, Set<Document | ShadowRoot>>();
        const overrideSheetsByNode = new WeakMap<Document | ShadowRoot, Set<CSSStyleSheet>>();
        const overrideSheets = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
        const relevantOverrides = new WeakSet<CSSStyleSheet>();

        let observableStyleDeclarations = new WeakMap<CSSStyleDeclaration, CSSStyleSheet>();
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

        let sheetCounter = 0;
        const sheetIds = new WeakMap<CSSStyleSheet, number>();
        const sheetsById = new Map<number, CSSStyleSheet>();
        const getSheetId = (sheet: CSSStyleSheet) => {
            if (sheetIds.has(sheet)) {
                return sheetIds.get(sheet)!;
            }
            const id = ++sheetCounter;
            sheetIds.set(sheet, id);
            sheetsById.set(id, sheet);
            return id;
        };

        const cleanNode = (node: Document | ShadowRoot) => {
            targetNodes.delete(node);
            nodesById.delete(getNodeId(node));
            iterateSourceSheets(node, (sheet) => {
                sourceSheetNodes.get(sheet)?.delete(node);
                if (sourceSheetNodes.get(sheet)?.size === 0) {
                    sourceSheetNodes.delete(sheet);
                }
            });
            const overrides = overrideSheetsByNode.get(node);
            if (overrides && Array.isArray(node.adoptedStyleSheets)) {
                overrides.forEach((override) => {
                    const index = node.adoptedStyleSheets.indexOf(override);
                    if (index >= 0) {
                        node.adoptedStyleSheets.splice(index, 1);
                    }
                });
            }
            overrideSheetsByNode.delete(node);
        };

        const iterateSourceSheets = (node: Document | ShadowRoot, iterator: (sheet: CSSStyleSheet) => void) => {
            if (Array.isArray(node.adoptedStyleSheets)) {
                const overrides = overrideSheetsByNode.get(node);
                node.adoptedStyleSheets.forEach((sheet) => {
                    if (!overrides || !overrides.has(sheet)) {
                        if (!sourceSheets.has(sheet)) {
                            sourceSheets.add(sheet);
                        }
                        if (!sourceSheetNodes.has(sheet)) {
                            sourceSheetNodes.set(sheet, new Set());
                        }
                        sourceSheetNodes.get(sheet)!.add(node);
                        iterator(sheet);
                    }
                });
            }
        };

        const getSourceSheets = (node: Document | ShadowRoot) => {
            const allRules: NodeSheet[] = [];
            iterateSourceSheets(node, (sheet) => {
                const sheetId = getSheetId(sheet);
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    const rule = sheet.cssRules[i];
                    if ((rule as CSSStyleRule).style) {
                        observableStyleDeclarations.set((rule as CSSStyleRule).style, sheet);
                    }
                }
                allRules.push({sheetId, sheet});
            });
            return allRules;
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

        const queuedSheetChanges = new Set<CSSStyleSheet>();

        const handleSheetChangeForNode = (node: Document | ShadowRoot) => {
            if (!node.isConnected) {
                cleanNode(node);
                return;
            }
            if (!targetNodes.has(node)) {
                targetNodes.add(node);
            }
            const sheets = getSourceSheets(node);
            if (sheets.every(({sheet}) => queuedSheetChanges.has(sheet))) {
                return;
            }
            const unqueuedSheets: NodeSheet[] = [];
            unqueuedSheets.forEach(({sheetId, sheet}) => {
                if (queuedSheetChanges.has(sheet)) {
                    return;
                }
                const override = overrideSheets.get(sheet);
                if (override && relevantOverrides.has(override)) {
                    putOverride(node, override);
                } else {
                    queuedSheetChanges.add(sheet);
                    unqueuedSheets.push({sheetId, sheet});
                }
            });
            if (unqueuedSheets.length > 0) {
                queueMicrotask(() => {
                    unqueuedSheets.forEach(({sheet}) => queuedSheetChanges.delete(sheet));
                    sendSourceStyles(sheets);
                });
            }
        };

        const handleSheetChange = (sheet: CSSStyleSheet) => {
            if (queuedSheetChanges.has(sheet)) {
                return;
            }
            const sheetId = getSheetId(sheet);
            queueMicrotask(() => {
                const override = overrideSheets.get(sheet);
                if (override) {
                    relevantOverrides.delete(override);
                }
                sendSourceStyles([{sheetId, sheet}]);
            });
        };

        const executeCommands = (sheet: CSSStyleSheet, commands: StyleSheetCommand[]) => {
            executing = true;

            let override: CSSStyleSheet;
            if (overrideSheets.has(sheet)) {
                override = overrideSheets.get(sheet)!;
            } else {
                override = new CSSStyleSheet();
                overrideSheets.set(sheet, override);
            }

            commands.forEach((c) => {
                const {type, path, cssText} = c;
                let target: CSSStyleSheet | CSSGroupingRule = override;
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

            const nodes = sourceSheetNodes.get(sheet) ?? new Set();
            nodes.forEach((node) => putOverride(node, override));
            relevantOverrides.add(override);

            executing = false;
        };

        const putOverride = (node: Document | ShadowRoot, override: CSSStyleSheet) => {
            const wasExecuting = executing;
            executing = true;

            if (!node.isConnected) {
                cleanNode(node);
                return;
            }
            const overrideIndex = node.adoptedStyleSheets.indexOf(override);
            if (overrideIndex < 0) {
                node.adoptedStyleSheets.push(override);
            } else if (overrideIndex !== node.adoptedStyleSheets.length - 1) {
                node.adoptedStyleSheets.splice(overrideIndex, 1);
                node.adoptedStyleSheets.push(override);
            }

            if (!wasExecuting) {
                executing = false;
            }
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
                        handleSheetChangeForNode(node);
                    }
                    return true;
                },
            });
            adoptedSheetsSourceProxies.set(source, proxy);
            adoptedSheetsProxySources.set(proxy, source);
            return proxy;
        };

        const proxyAdoptedStyleSheets = () => [Document, ShadowRoot].forEach((ctor: {prototype: Document | ShadowRoot}) => {
            overrideProperty(ctor, 'adoptedStyleSheets', {
                get: (native) => function () {
                    const source = native.call(this) as CSSStyleSheet[];
                    return proxyArray(this, source);
                },
                set: (native) => function (source) {
                    if (adoptedSheetsProxySources.has(source)) {
                        source = adoptedSheetsProxySources.get(source);
                    }
                    native.call(this, source);
                    handleSheetChangeForNode(this);
                },
            });
        });

        const proxyStyleDeclaration = () => (['setProperty', 'removeProperty'] as Array<keyof CSSStyleDeclaration>).forEach((key) => {
            override(CSSStyleDeclaration, key, (native) => {
                return function (...args: any[]) {
                    const returnValue = native.apply(this, args);
                    if (observableStyleDeclarations.has(this)) {
                        const sheet = observableStyleDeclarations.get(this)!;
                        handleSheetChange(sheet);
                    }
                    return returnValue;
                };
            });
        });

        const sendSourceStyles = (sheets: NodeSheet[]) => {
            const data = {detail: {sheets}};
            const event = new CustomEvent('__darkreader__adoptedStyleSheetsChange', data);
            document.dispatchEvent(event);
        };

        const commandsListener = (e: CustomEvent) => {
            const response = JSON.parse(e.detail) as Array<{sheetId: number; commands: StyleSheetCommand[]}>;
            response.forEach(({sheetId, commands}) => {
                const sheet = sheetsById.get(sheetId);
                if (sheet) {
                    executeCommands(sheet, commands);
                }
            });
        };

        onFFSheetChange = (sheet) => {
            if (sourceSheets.has(sheet)) {
                handleSheetChange(sheet);
            }
        };

        documentEventListener('__darkreader__startAdoptedStyleSheetsWatcher', () => {
            proxyAdoptedStyleSheets();
            proxyStyleDeclaration();

            documentEventListener('__darkreader__adoptedStyleSheetCommands', commandsListener);

            walkNodesWithAdoptedStyles(document, (node) => targetNodes.add(node));
            cleaners.push(() => targetNodes.forEach((node) => cleanNode(node)));

            const allSheets: NodeSheet[] = [];
            const addedSheetIds = new Set<number>();
            targetNodes.forEach((node) => {
                const sheets = getSourceSheets(node);
                const filtered = sheets.filter(({sheetId}) => !addedSheetIds.has(sheetId));
                allSheets.push(...filtered);
                filtered.forEach(({sheetId}) => addedSheetIds.add(sheetId));
            });
            sendSourceStyles(allSheets);
        });
    }
}
