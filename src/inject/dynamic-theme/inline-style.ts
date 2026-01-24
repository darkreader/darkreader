import type {Theme} from '../../definitions';
import {forEach, push} from '../../utils/array';
import {isShadowDomSupported} from '../../utils/platform';
import {throttle} from '../../utils/throttle';
import {getDuration} from '../../utils/time';
import {getAbsoluteURL} from '../../utils/url';
import {iterateShadowHosts, createOptimizedTreeObserver, isReadyStateComplete, addReadyStateCompleteListener, addDOMReadyListener, isDOMReady} from '../utils/dom';

import {iterateCSSDeclarations} from './css-rules';
import {getImageDetails} from './image';
import {getModifiableCSSDeclaration} from './modify-css';
import type {CSSVariableModifier, ModifiedVarDeclaration} from './variables';
import {variablesStore} from './variables';


interface Overrides {
    [cssProp: string]: {
        customProp: string;
        cssProp: string;
        dataAttr: string;
    };
}

const overrides: Overrides = {
    'background-color': {
        customProp: '--darkreader-inline-bgcolor',
        cssProp: 'background-color',
        dataAttr: 'data-darkreader-inline-bgcolor',
    },
    'background-image': {
        customProp: '--darkreader-inline-bgimage',
        cssProp: 'background-image',
        dataAttr: 'data-darkreader-inline-bgimage',
    },
    'border-color': {
        customProp: '--darkreader-inline-border',
        cssProp: 'border-color',
        dataAttr: 'data-darkreader-inline-border',
    },
    'border-bottom-color': {
        customProp: '--darkreader-inline-border-bottom',
        cssProp: 'border-bottom-color',
        dataAttr: 'data-darkreader-inline-border-bottom',
    },
    'border-left-color': {
        customProp: '--darkreader-inline-border-left',
        cssProp: 'border-left-color',
        dataAttr: 'data-darkreader-inline-border-left',
    },
    'border-right-color': {
        customProp: '--darkreader-inline-border-right',
        cssProp: 'border-right-color',
        dataAttr: 'data-darkreader-inline-border-right',
    },
    'border-top-color': {
        customProp: '--darkreader-inline-border-top',
        cssProp: 'border-top-color',
        dataAttr: 'data-darkreader-inline-border-top',
    },
    'box-shadow': {
        customProp: '--darkreader-inline-boxshadow',
        cssProp: 'box-shadow',
        dataAttr: 'data-darkreader-inline-boxshadow',
    },
    'color': {
        customProp: '--darkreader-inline-color',
        cssProp: 'color',
        dataAttr: 'data-darkreader-inline-color',
    },
    'fill': {
        customProp: '--darkreader-inline-fill',
        cssProp: 'fill',
        dataAttr: 'data-darkreader-inline-fill',
    },
    'stroke': {
        customProp: '--darkreader-inline-stroke',
        cssProp: 'stroke',
        dataAttr: 'data-darkreader-inline-stroke',
    },
    'outline-color': {
        customProp: '--darkreader-inline-outline',
        cssProp: 'outline-color',
        dataAttr: 'data-darkreader-inline-outline',
    },
    'stop-color': {
        customProp: '--darkreader-inline-stopcolor',
        cssProp: 'stop-color',
        dataAttr: 'data-darkreader-inline-stopcolor',
    },
};

const shorthandOverrides: Overrides = {
    'background': {
        customProp: '--darkreader-inline-bg',
        cssProp: 'background',
        dataAttr: 'data-darkreader-inline-bg',
    },
    'border': {
        customProp: '--darkreader-inline-border-short',
        cssProp: 'border',
        dataAttr: 'data-darkreader-inline-border-short',
    },
    'border-bottom': {
        customProp: '--darkreader-inline-border-bottom-short',
        cssProp: 'border-bottom',
        dataAttr: 'data-darkreader-inline-border-bottom-short',
    },
    'border-left': {
        customProp: '--darkreader-inline-border-left-short',
        cssProp: 'border-left',
        dataAttr: 'data-darkreader-inline-border-left-short',
    },
    'border-right': {
        customProp: '--darkreader-inline-border-right-short',
        cssProp: 'border-right',
        dataAttr: 'data-darkreader-inline-border-right-short',
    },
    'border-top': {
        customProp: '--darkreader-inline-border-top-short',
        cssProp: 'border-top',
        dataAttr: 'data-darkreader-inline-border-top-short',
    },
};

const overridesList = Object.values(overrides);
const normalizedPropList: Record<string, string> = {};
overridesList.forEach(({cssProp, customProp}) => normalizedPropList[customProp] = cssProp);

const INLINE_STYLE_ATTRS = ['style', 'fill', 'stop-color', 'stroke', 'bgcolor', 'color', 'background'];
export const INLINE_STYLE_SELECTOR = INLINE_STYLE_ATTRS.map((attr) => `[${attr}]`).join(', ');

export function getInlineOverrideStyle(): string {
    const allOverrides = overridesList.concat(Object.values(shorthandOverrides));
    return allOverrides.map(({dataAttr, customProp, cssProp}) => {
        return [
            `[${dataAttr}] {`,
            `  ${cssProp}: var(${customProp}) !important;`,
            '}',
        ].join('\n');
    }).concat([
        '[data-darkreader-inline-invert] {',
        '    filter: invert(100%) hue-rotate(180deg);',
        '}',
    ]).join('\n');
}

function getInlineStyleElements(root: Node) {
    const results: Element[] = [];
    if (root instanceof Element && root.matches(INLINE_STYLE_SELECTOR)) {
        results.push(root);
    }
    if (root instanceof Element || (isShadowDomSupported && root instanceof ShadowRoot) || root instanceof Document) {
        push(results, root.querySelectorAll(INLINE_STYLE_SELECTOR));
    }
    return results;
}

const treeObservers = new Map<Node, {disconnect(): void}>();
const attrObservers = new Map<Node, MutationObserver>();

export function watchForInlineStyles(
    elementStyleDidChange: (element: HTMLElement) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void,
): void {
    deepWatchForInlineStyles(document, elementStyleDidChange, shadowRootDiscovered);
    iterateShadowHosts(document.documentElement, (host) => {
        deepWatchForInlineStyles(host.shadowRoot!, elementStyleDidChange, shadowRootDiscovered);
    });
}

function deepWatchForInlineStyles(
    root: Document | ShadowRoot,
    elementStyleDidChange: (element: HTMLElement) => void,
    shadowRootDiscovered: (root: ShadowRoot) => void,
): void {
    if (treeObservers.has(root)) {
        treeObservers.get(root)!.disconnect();
        attrObservers.get(root)!.disconnect();
    }

    const discoveredNodes = new WeakSet<Node>();

    function discoverNodes(node: Node) {
        getInlineStyleElements(node).forEach((el: HTMLElement) => {
            if (discoveredNodes.has(el)) {
                return;
            }
            discoveredNodes.add(el);
            elementStyleDidChange(el);
        });
        iterateShadowHosts(node, (n) => {
            if (discoveredNodes.has(node)) {
                return;
            }
            discoveredNodes.add(node);
            shadowRootDiscovered(n.shadowRoot!);
            deepWatchForInlineStyles(n.shadowRoot!, elementStyleDidChange, shadowRootDiscovered);
        });
        variablesStore.matchVariablesAndDependents();
    }

    const treeObserver = createOptimizedTreeObserver(root, {
        onMinorMutations: (_root, {additions}) => {
            additions.forEach((added) => discoverNodes(added));
        },
        onHugeMutations: () => {
            discoverNodes(root);
        },
    });
    treeObservers.set(root, treeObserver);

    let attemptCount = 0;
    let start: number | null = null;
    const ATTEMPTS_INTERVAL = getDuration({seconds: 10});
    const RETRY_TIMEOUT = getDuration({seconds: 2});
    const MAX_ATTEMPTS_COUNT = 50;
    let cache: MutationRecord[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleAttributeMutations = throttle((mutations: MutationRecord[]) => {
        const handledTargets = new Set<Node>();
        mutations.forEach((m) => {
            const target = m.target as HTMLElement;
            if (handledTargets.has(target)) {
                return;
            }
            if (INLINE_STYLE_ATTRS.includes(m.attributeName!)) {
                handledTargets.add(target);
                elementStyleDidChange(target);
            }
        });
        variablesStore.matchVariablesAndDependents();
    });
    const attrObserver = new MutationObserver((mutations) => {
        if (timeoutId) {
            cache.push(...mutations);
            return;
        }
        attemptCount++;
        const now = Date.now();
        if (start == null) {
            start = now;
        } else if (attemptCount >= MAX_ATTEMPTS_COUNT) {
            if (now - start < ATTEMPTS_INTERVAL) {
                timeoutId = setTimeout(() => {
                    start = null;
                    attemptCount = 0;
                    timeoutId = null;
                    const attributeCache = cache;
                    cache = [];
                    handleAttributeMutations(attributeCache);
                }, RETRY_TIMEOUT);
                cache.push(...mutations);
                return;
            }
            start = now;
            attemptCount = 1;
        }
        handleAttributeMutations(mutations);
    });
    attrObserver.observe(root, {
        attributes: true,
        attributeFilter: INLINE_STYLE_ATTRS.concat(overridesList.map(({dataAttr}) => dataAttr)),
        subtree: true,
    });
    attrObservers.set(root, attrObserver);
}

export function stopWatchingForInlineStyles(): void {
    treeObservers.forEach((o) => o.disconnect());
    attrObservers.forEach((o) => o.disconnect());
    treeObservers.clear();
    attrObservers.clear();
}

const inlineStyleCache = new WeakMap<HTMLElement, string>();
const svgInversionCache = new WeakSet<SVGSVGElement>();
const svgAnalysisConditionCache = new WeakMap<SVGSVGElement, boolean>();
const themeProps: Array<keyof Theme> = ['brightness', 'contrast', 'grayscale', 'sepia', 'mode'];

function shouldAnalyzeSVGAsImage(svg: SVGSVGElement) {
    if (svgAnalysisConditionCache.has(svg)) {
        return svgAnalysisConditionCache.get(svg);
    }
    const shouldAnalyze = Boolean(
        svg && (
            svg.getAttribute('class')?.includes('logo') ||
            svg.parentElement?.getAttribute('class')?.includes('logo')
        )
    );
    svgAnalysisConditionCache.set(svg, shouldAnalyze);
    return shouldAnalyze;
}

function getInlineStyleCacheKey(el: HTMLElement, theme: Theme): string {
    return INLINE_STYLE_ATTRS
        .map((attr) => `${attr}="${el.getAttribute(attr)}"`)
        .concat(themeProps.map((prop) => `${prop}="${theme[prop]}"`))
        .join(' ');
}

function shouldIgnoreInlineStyle(element: HTMLElement, selectors: string[]): boolean {
    for (let i = 0, len = selectors.length; i < len; i++) {
        const ingnoredSelector = selectors[i];
        if (element.matches(ingnoredSelector)) {
            return true;
        }
    }
    return false;
}

const LOOP_DETECTION_THRESHOLD = 1000;
const MAX_LOOP_CYCLES = 10;
const elementsLastChanges = new WeakMap<Node, number>();
const elementsLoopCycles = new WeakMap<Node, number>();

const SMALL_SVG_THRESHOLD = 32;
const svgNodesRoots = new WeakMap<Node, SVGSVGElement | null>();
const svgRootSizeTestResults = new WeakMap<SVGSVGElement, boolean>();

function getSVGElementRoot(svgElement: SVGElement): SVGSVGElement | null {
    if (!svgElement) {
        return null;
    }

    if (svgNodesRoots.has(svgElement)) {
        return svgNodesRoots.get(svgElement)!
    }

    if (svgElement instanceof SVGSVGElement) {
        return svgElement;
    }

    const parent = svgElement.parentNode as SVGElement;
    const root = getSVGElementRoot(parent!);
    svgNodesRoots.set(svgElement, root);
    return root;
}

const inlineStringValueCache = new Map<string, Map<string, string>>();

export function overrideInlineStyle(element: HTMLElement, theme: Theme, ignoreInlineSelectors: string[], ignoreImageSelectors: string[]): void {
    if (elementsLastChanges.has(element)) {
        if (Date.now() - elementsLastChanges.get(element)! < LOOP_DETECTION_THRESHOLD) {
            const cycles = elementsLoopCycles.get(element) ?? 0;
            elementsLoopCycles.set(element, cycles + 1);
        }
        if ((elementsLoopCycles.get(element) ?? 0) >= MAX_LOOP_CYCLES) {
            return;
        }
    }

    // ProseMirror editor rebuilds entire HTML after style changes
    if (element.parentElement?.dataset.nodeViewContent) {
        return;
    }

    const cacheKey = getInlineStyleCacheKey(element, theme);
    if (cacheKey === inlineStyleCache.get(element)) {
        return;
    }

    const unsetProps = new Set(Object.keys(overrides));

    function setCustomProp(targetCSSProp: string, modifierCSSProp: string, cssVal: string) {
        const cachedStringValue = inlineStringValueCache.get(modifierCSSProp)?.get(cssVal);
        if (cachedStringValue) {
            setStaticValue(cachedStringValue);
            return;
        }

        const mod = getModifiableCSSDeclaration(
            modifierCSSProp,
            cssVal,
            {style: element.style} as CSSStyleRule,
            variablesStore,
            ignoreImageSelectors,
            null,
        );
        if (!mod) {
            return;
        }

        function setStaticValue(value: string) {
            const {customProp, dataAttr} = overrides[targetCSSProp] ?? shorthandOverrides[targetCSSProp];
            element.style.setProperty(customProp, value);
            if (!element.hasAttribute(dataAttr)) {
                element.setAttribute(dataAttr, '');
            }
            unsetProps.delete(targetCSSProp);
        }

        function setVarDeclaration(mod: ReturnType<CSSVariableModifier>) {
            let prevDeclarations: ModifiedVarDeclaration[] = [];

            function setProps(declarations: ModifiedVarDeclaration[]) {
                prevDeclarations.forEach(({property}) => {
                    element.style.removeProperty(property);
                });
                declarations.forEach(({property, value}) => {
                    if (!(value instanceof Promise)) {
                        element.style.setProperty(property, value);
                    }
                });
                prevDeclarations = declarations;
            }

            setProps(mod.declarations);
            mod.onTypeChange.addListener(setProps);
        }

        function setAsyncValue(promise: Promise<string | null>, sourceValue: string) {
            promise.then((value) => {
                if (value && targetCSSProp === 'background' && value.startsWith('var(--darkreader-bg--')) {
                    setStaticValue(value);
                }
                if (value && targetCSSProp === 'background-image') {
                    if ((element === document.documentElement || element === document.body) && value === sourceValue) {
                        // Remove big bright backgrounds from root or body
                        value = 'none';
                    }
                    setStaticValue(value);
                }
                inlineStyleCache.set(element, getInlineStyleCacheKey(element, theme));
            });
        }

        const value = typeof mod.value === 'function' ? mod.value(theme) : mod.value;
        if (typeof value === 'string') {
            setStaticValue(value);
            if (!inlineStringValueCache.has(modifierCSSProp)) {
                inlineStringValueCache.set(modifierCSSProp, new Map());
            }
            inlineStringValueCache.get(modifierCSSProp)!.set(cssVal, value);
        } else if (value instanceof Promise) {
            setAsyncValue(value, cssVal);
        } else if (typeof value === 'object') {
            setVarDeclaration(value);
        }
    }

    if (ignoreInlineSelectors.length > 0) {
        if (shouldIgnoreInlineStyle(element, ignoreInlineSelectors)) {
            unsetProps.forEach((cssProp) => {
                element.removeAttribute(overrides[cssProp].dataAttr);
            });
            return;
        }
    }

    const isSVGElement = element instanceof SVGElement;
    const svg = isSVGElement ? element.ownerSVGElement ?? (element instanceof SVGSVGElement ? element : null) : null;
    if (isSVGElement && theme.mode === 1 && svg) {
        if (svgInversionCache.has(svg)) {
            return;
        }
        if (shouldAnalyzeSVGAsImage(svg)) {
            svgInversionCache.add(svg);
            const analyzeSVGAsImage = () => {
                let svgString = svg.outerHTML;
                svgString = svgString.replaceAll('<style class="darkreader darkreader--sync" media="screen"></style>', '');
                const dataURL = `data:image/svg+xml;base64,${btoa(svgString)}`;
                getImageDetails(dataURL).then((details) => {
                    if (
                        (details.isDark && details.isTransparent) ||
                        (details.isLarge && details.isLight && !details.isTransparent)
                    ) {
                        svg.setAttribute('data-darkreader-inline-invert', '');
                    } else {
                        svg.removeAttribute('data-darkreader-inline-invert');
                    }
                });
            };
            analyzeSVGAsImage();
            if (!isDOMReady()) {
                addDOMReadyListener(analyzeSVGAsImage);
            }
            return;
        }
    }

    if (element.hasAttribute('bgcolor')) {
        let value = element.getAttribute('bgcolor')!;
        if (value.match(/^[0-9a-f]{3}$/i) || value.match(/^[0-9a-f]{6}$/i)) {
            value = `#${value}`;
        }
        setCustomProp('background-color', 'background-color', value);
    }

    if ((element === document.documentElement || element === document.body) && element.hasAttribute('background')) {
        const url = getAbsoluteURL(location.href, element.getAttribute('background') ?? '');
        const value = `url("${url}")`;
        setCustomProp('background-image', 'background-image', value);
    }

    // We can catch some link elements here, that are from `<link rel="mask-icon" color="#000000">`.
    // It's valid HTML code according to the specs, https://html.spec.whatwg.org/#attr-link-color
    // We don't want to touch such links, as it cause weird browser behavior (silent DOMException).
    if (element.hasAttribute('color') && (element as HTMLLinkElement).rel !== 'mask-icon') {
        let value = element.getAttribute('color')!;
        if (value.match(/^[0-9a-f]{3}$/i) || value.match(/^[0-9a-f]{6}$/i)) {
            value = `#${value}`;
        } else if (value.match(/^#?[0-9a-f]{4}$/i)) {
            const hex = value.startsWith('#') ? value.substring(1) : value;
            value = `#${hex}00`;
        }
        setCustomProp('color', 'color', value);
    }

    if (isSVGElement) {
        if (element.hasAttribute('fill')) {
            const value = element.getAttribute('fill')!;
            if (value !== 'none' && value !== 'currentColor') {
                if (!(element instanceof SVGTextElement)) {
                    // getBoundingClientRect forces a layout change. And when it happens and
                    // the DOM is not in the `complete` readystate, it will cause the layout to be drawn
                    // and it will cause a layout of unstyled content which results in white flashes.
                    // Therefore, check if the DOM is at the `complete` readystate.
                    const handleSVGElement = () => {
                        let isSVGSmall = false;
                        const root = getSVGElementRoot(element);
                        if (!root) {
                            return;
                        }
                        if (svgRootSizeTestResults.has(root)) {
                            isSVGSmall = svgRootSizeTestResults.get(root)!;
                        } else {
                            const svgBounds = root.getBoundingClientRect();
                            isSVGSmall = svgBounds.width * svgBounds.height <= Math.pow(SMALL_SVG_THRESHOLD, 2);
                            svgRootSizeTestResults.set(root, isSVGSmall);
                        }
                        let isBg: boolean;
                        if (isSVGSmall) {
                            isBg = false;
                        } else {
                            const {width, height} = element.getBoundingClientRect();
                            isBg = (width > SMALL_SVG_THRESHOLD || height > SMALL_SVG_THRESHOLD);
                        }
                        setCustomProp('fill', isBg ? 'background-color' : 'color', value);
                    };

                    if (isReadyStateComplete()) {
                        handleSVGElement();
                    } else {
                        addReadyStateCompleteListener(handleSVGElement);
                    }
                } else {
                    setCustomProp('fill', 'color', value);
                }
            }
        }
        if (element.hasAttribute('stop-color')) {
            setCustomProp('stop-color', 'background-color', element.getAttribute('stop-color')!);
        }
    }

    if (element.hasAttribute('stroke')) {
        const value = element.getAttribute('stroke')!;
        setCustomProp('stroke', element instanceof SVGLineElement || element instanceof SVGTextElement ? 'border-color' : 'color', value);
    }

    element.style && iterateCSSDeclarations(element.style, (property, value) => {
        // Temporarily ignore background images due to the possible performance
        // issues and complexity of handling async requests.
        if (property === 'background-image' && value.includes('url')) {
            if (element === document.documentElement || element === document.body) {
                setCustomProp(property, property, value);
            }
            return;
        }
        if (overrides.hasOwnProperty(property) || (property.startsWith('--') && !normalizedPropList[property])) {
            setCustomProp(property, property, value);
        } else if (shorthandOverrides[property] && value.includes('var(')) {
            setCustomProp(property, property, value);
        } else {
            const overriddenProp = normalizedPropList[property];
            if (overriddenProp &&
                (!element.style.getPropertyValue(overriddenProp) && !element.hasAttribute(overriddenProp))) {
                if (overriddenProp === 'background-color' && element.hasAttribute('bgcolor')) {
                    return;
                }
                element.style.setProperty(property, '');
            }
        }
    });

    if (element.style && element instanceof SVGTextElement && element.style.fill) {
        setCustomProp('fill', 'color', element.style.getPropertyValue('fill'));
    }

    if (element.getAttribute('style')?.includes('--')) {
        variablesStore.addInlineStyleForMatching(element.style);
    }

    forEach(unsetProps, (cssProp) => {
        element.removeAttribute(overrides[cssProp].dataAttr);
    });
    inlineStyleCache.set(element, getInlineStyleCacheKey(element, theme));

    elementsLastChanges.set(element, Date.now());
}
