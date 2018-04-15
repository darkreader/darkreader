import {iterateCSSRules, iterateCSSDeclarations, replaceCSSRelativeURLsWithAbsolute, replaceCSSFontFace, replaceCSSVariables} from './css-rules';
import {getModifiableCSSDeclaration, getModifiedFallbackStyle, ModifiableCSSDeclaration, ModifiableCSSRule} from './modify-css';
import {bgFetch} from './network';
import {removeNode} from '../utils/dom';
import {FilterConfig} from '../../definitions';

declare global {
    interface HTMLStyleElement {
        sheet: CSSStyleSheet;
    }
    interface HTMLLinkElement {
        sheet: CSSStyleSheet;
    }
}

export interface StyleManager {
    details(): {variables: Map<string, string>};
    render(filter: FilterConfig, variables: Map<string, string>): void;
    pause(): void;
    destroy(): void;
}

export default async function manageStyle(element: HTMLLinkElement | HTMLStyleElement, {update}): Promise<StyleManager> {

    const prevStyles: HTMLStyleElement[] = [];
    let next: Element = element;
    while ((next = next.nextElementSibling) && next.matches('.darkreader')) {
        prevStyles.push(next as HTMLStyleElement);
    }
    let corsCopy: HTMLStyleElement = prevStyles.find((el) => el.matches('.darkreader--cors')) || null;
    let syncStyle: HTMLStyleElement = prevStyles.find((el) => el.matches('.darkreader--sync')) || null;
    const asyncStyles: HTMLStyleElement[] = prevStyles.filter((el) => el.matches('.darkreader--async'));

    let cancelAsyncOperations = false;

    function isCancelled() {
        return cancelAsyncOperations;
    }

    const observer = new MutationObserver(async (mutations) => {
        rules = await getRules();
        update();
    });
    const observerOptions: MutationObserverInit = {attributes: true, childList: true};

    let rules: CSSRuleList;

    async function getRules() {
        let rules: CSSRuleList = null;
        if (element.sheet == null) {
            if (element instanceof HTMLLinkElement) {
                await linkLoading(element);
                if (cancelAsyncOperations) {
                    return null;
                }
            } else {
                return null;
            }
        }
        try {
            rules = element.sheet.cssRules;
        } catch (err) {
            // Sometimes cross-origin stylesheets are protected from direct access
            // so need to load CSS text and insert it into style element
            const link = element as HTMLLinkElement;
            if (corsCopy) {
                rules = corsCopy.sheet.cssRules;
            } else {
                corsCopy = await createCORSCopy(link, isCancelled);
                if (corsCopy) {
                    rules = corsCopy.sheet.cssRules;
                }
            }
        }
        return rules;
    }

    function getVariables() {
        const variables = new Map<string, string>();
        rules && iterateCSSRules(rules, (rule) => {
            rule.style && iterateCSSDeclarations(rule.style, (property, value) => {
                if (property.startsWith('--')) {
                    variables.set(property, value);
                }
            });
        });
        return variables;
    }

    function details() {
        const variables = getVariables();
        return {variables};
    }

    function getFilterKey(filter: FilterConfig) {
        return ['mode', 'brightness', 'contrast', 'grayscale', 'sepia'].map((p) => `${p}:${filter[p]}`).join(';');
    }

    const rulesTextCache = new Map<string, string>();
    const rulesModCache = new Map<string, ModifiableCSSRule>();
    let prevFilterKey: string = null;

    async function render(filter: FilterConfig, variables: Map<string, string>) {
        if (!rules) {
            // Observer fails to trigger change?
            rules = await getRules();
            if (!rules) {
                return null;
            }
        }
        cancelAsyncOperations = false;
        let rulesChanged = (rulesModCache.size === 0);
        const notFoundCacheKeys = new Set(rulesModCache.keys());
        const filterKey = getFilterKey(filter);
        let filterChanged = (filterKey !== prevFilterKey);

        const modRules: ModifiableCSSRule[] = [];
        iterateCSSRules(rules, (rule) => {
            let cssText = rule.cssText;
            let textDiffersFromPrev = false;

            notFoundCacheKeys.delete(cssText);
            if (!rulesTextCache.has(cssText)) {
                rulesTextCache.set(cssText, cssText);
                textDiffersFromPrev = true;
            }

            // Put CSS text with inserted CSS variables into separate <style> element
            // to properly handle composite properties (e.g. background -> background-color)
            let vars: HTMLStyleElement = null;
            let varsRule: CSSStyleRule = null;
            if (variables.size > 0) {
                const cssTextWithVariables = replaceCSSVariables(cssText, variables);
                if (rulesTextCache.get(cssText) !== cssTextWithVariables) {
                    rulesTextCache.set(cssText, cssTextWithVariables);
                    textDiffersFromPrev = true;
                    vars = document.createElement('style');
                    vars.classList.add('darkreader');
                    vars.classList.add('darkreader--vars');
                    vars.media = 'screen';
                    vars.textContent = cssTextWithVariables;
                    element.parentElement.insertBefore(vars, element.nextSibling);
                    varsRule = (vars.sheet as CSSStyleSheet).cssRules[0] as CSSStyleRule;
                }
            }

            if (textDiffersFromPrev) {
                rulesChanged = true;
            } else {
                modRules.push(rulesModCache.get(cssText));
                return;
            }

            const modDecs: ModifiableCSSDeclaration[] = [];
            const targetRule = varsRule || rule;
            targetRule && iterateCSSDeclarations(targetRule.style, (property, value) => {
                const mod = getModifiableCSSDeclaration(property, value, rule, isCancelled);
                if (mod) {
                    modDecs.push(mod);
                }
            });

            let modRule: ModifiableCSSRule = null;
            if (modDecs.length > 0) {
                modRule = {selector: rule.selectorText, declarations: modDecs};
                if (rule.parentRule instanceof CSSMediaRule) {
                    modRule.media = (rule.parentRule as CSSMediaRule).media.mediaText;
                }
                modRules.push(modRule);
            }
            rulesModCache.set(cssText, modRule);

            removeNode(vars);
        });

        notFoundCacheKeys.forEach((key) => {
            rulesTextCache.delete(key);
            rulesModCache.delete(key);
        });
        prevFilterKey = filterKey;

        if (!rulesChanged && !filterChanged) {
            return;
        }

        asyncStyles.forEach(removeNode);
        asyncStyles.splice(0);

        interface AsyncQueueDeclaration {
            media: string;
            selector: string;
            property: string;
            value: string;
            importantKeyword: string;
        }

        const queue: AsyncQueueDeclaration[] = [];
        let frameId = null;

        function addToQueue(d: AsyncQueueDeclaration) {
            queue.push(d);
            if (!frameId) {
                frameId = requestAnimationFrame(() => {
                    frameId = null;
                    if (cancelAsyncOperations) {
                        return;
                    }
                    const mediaGroups = queue.reduce((groups, d) => {
                        const media = d.media || '';
                        if (!groups[media]) {
                            groups[media] = [];
                        }
                        groups[media].push(d);
                        return groups;
                    }, {} as {[media: string]: AsyncQueueDeclaration[]})
                    const asyncStyle = document.createElement('style');
                    asyncStyle.classList.add('darkreader');
                    asyncStyle.classList.add('darkreader--async');
                    asyncStyle.media = 'screen';
                    asyncStyle.textContent = Object.entries(mediaGroups).map(([media, decs]) => [
                        media && `@media ${media} {`,
                        decs.map(({selector, property, value, importantKeyword}) => [
                            `${selector} {`,
                            `    ${property}: ${value}${importantKeyword};`,
                            '}',
                        ].join('\n')).join('\n'),
                        media && '}',
                    ].filter((ln) => ln)).join('\n');
                    const insertTarget = asyncStyles.length > 0 ? asyncStyles[asyncStyles.length - 1].nextSibling : syncStyle.nextSibling;
                    element.parentElement.insertBefore(asyncStyle, insertTarget);
                    asyncStyles.push(asyncStyle);
                });
            }
        }

        const lines: string[] = [];
        modRules.filter((r) => r).forEach(({selector, declarations, media}) => {
            if (media) {
                lines.push(`@media ${media} {`);
            }
            lines.push(`${selector} {`);
            declarations.forEach(({property, value, important}) => {
                const importantKeyword = important ? ' !important' : '';
                if (typeof value === 'function') {
                    const modified = value(filter);
                    if (modified instanceof Promise) {
                        modified.then((asyncValue) => {
                            if (cancelAsyncOperations || !asyncValue) {
                                return;
                            }
                            addToQueue({media, selector, property, value: asyncValue, importantKeyword});
                        });
                    } else {
                        lines.push(`    ${property}: ${modified}${importantKeyword};`);
                    }
                } else {
                    lines.push(`    ${property}: ${value}${importantKeyword};`);
                }
            });
            lines.push('}');
            if (media) {
                lines.push('}')
            }
        });

        if (!syncStyle) {
            syncStyle = document.createElement('style');
            syncStyle.classList.add('darkreader');
            syncStyle.classList.add('darkreader--sync');
            syncStyle.media = 'screen';
        }
        element.parentElement.insertBefore(syncStyle, corsCopy ? corsCopy.nextSibling : element.nextSibling);
        syncStyle.textContent = lines.join('\n');

        observer.observe(element, observerOptions);
    }

    function pause() {
        observer.disconnect();
        cancelAsyncOperations = true;
    }

    function destroy() {
        pause();
        removeNode(corsCopy);
        removeNode(syncStyle);
        asyncStyles.forEach(removeNode);
    }

    observer.observe(element, observerOptions);
    rules = await getRules();

    return {
        details,
        render,
        pause,
        destroy,
    };
}

function linkLoading(link: HTMLLinkElement) {
    return new Promise<void>((resolve, reject) => {
        const cleanUp = () => {
            link.removeEventListener('load', onLoad);
            link.removeEventListener('error', onError);
        }
        const onLoad = () => {
            cleanUp();
            resolve();
        };
        const onError = () => {
            cleanUp();
            reject(`Link loading failed ${link.href}`);
        };
        link.addEventListener('load', onLoad);
        link.addEventListener('error', onError);
    });
}

async function createCORSCopy(link: HTMLLinkElement, isCancelled: () => boolean) {
    const url = link.href;
    const prevCors = Array.from<HTMLStyleElement>(link.parentElement.querySelectorAll('.darkreader--cors')).find((el) => el.dataset.uri === url);
    if (prevCors) {
        return prevCors;
    }

    let response: string;
    const cache = localStorage.getItem(`darkreader-css-link-cache:${url}`);
    if (cache) {
        response = cache;
    } else {
        response = await bgFetch({url, responseType: 'text'});
        response && localStorage.setItem(`darkreader-css-link-cache:${url}`, response);
        if (isCancelled()) {
            return null;
        }
    }

    let cssText = response;
    cssText = replaceCSSFontFace(cssText);
    cssText = replaceCSSRelativeURLsWithAbsolute(cssText, url);
    cssText = cssText.trim();

    if (!cssText) {
        return null;
    }

    const cors = document.createElement('style');
    cors.classList.add('darkreader');
    cors.classList.add('darkreader--cors');
    cors.media = 'screen';
    cors.dataset.uri = url;
    cors.textContent = cssText;
    link.parentElement.insertBefore(cors, link.nextSibling);

    return cors;
}
