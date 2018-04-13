import {iterateCSSRules, iterateCSSDeclarations, getCSSBaseBath, getCSSURLValue, cssURLRegex, fontFaceRegex, replaceCSSVariables} from './css-rules';
import {getAbsoluteURL} from './url';
import {getModifiableCSSDeclaration, getModifiedUserAgentStyle, getModifiedFallbackStyle, cleanModificationCache, ModifiableCSSDeclaration, ModifiableCSSRule} from './modify-css';
import {bgFetch} from './network';
import state from './state';
import {removeStyle} from '../style';
import {FilterConfig} from '../../definitions';

const cache = new WeakMap<CSSStyleRule, ModifiableCSSRule>();

function createTheme(filter: FilterConfig) {
    let style = document.getElementById('dark-reader-style') as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.id = 'dark-reader-style';
        document.head.appendChild(style);
    }
    style.classList.add('dark-reader-style');
    style.classList.add('dark-reader-style--main');
    style.media = 'screen';

    const variables = new Map<string, string>();
    iterateCSSRules({
        filter: (s) => shouldAnalyzeStyle(s.ownerNode),
        iterate: (r) => {
            iterateCSSDeclarations(r, (property, value) => {
                if (property.startsWith('--')) {
                    variables.set(property, value);
                }
            });
        }
    });
    variables.forEach((value, key) => {
        const replaced = replaceCSSVariables(value, variables);
        if (!replaced) {
            console.warn(`Variable not found ${value}`);
            return;
        }
        variables.set(key, replaced);
    });

    const rules: ModifiableCSSRule[] = [];
    iterateCSSRules({
        filter: (s) => shouldAnalyzeStyle(s.ownerNode),
        iterate: (r) => {
            if (cache.has(r)) {
                const rule = cache.get(r);
                if (rule) {
                    rules.push(rule);
                }
                return;
            }

            const declarations: ModifiableCSSDeclaration[] = [];
            iterateCSSDeclarations(r, (property, value) => {
                const withVariables = replaceCSSVariables(value, variables);
                if (!withVariables) {
                    console.warn(`Variable not found ${value}`);
                    return;
                }

                const declaration = getModifiableCSSDeclaration(property, withVariables, r);
                if (declaration) {
                    declarations.push(declaration);
                }
            });

            let rule: ModifiableCSSRule = null;
            if (declarations.length > 0) {
                rule = {selector: r.selectorText, declarations};
                if (r.parentRule instanceof CSSMediaRule) {
                    rule.media = (r.parentRule as CSSMediaRule).media.mediaText;
                }
                rules.push(rule);
            }
            cache.set(r, rule);
        },
    });

    const lines: string[] = [];
    lines.push(getModifiedUserAgentStyle(filter));
    rules.forEach(({selector, declarations, media}) => {
        if (media) {
            lines.push(`@media ${media} {`);
        }
        lines.push(`${selector} {`);
        declarations.forEach(({property, value}) => {
            if (typeof value === 'function') {
                const modified = value(filter);
                if (modified instanceof Promise) {
                    modified.then((asyncValue) => {
                        if (!state.watching || !asyncValue) {
                            return;
                        }
                        const asyncStyle = document.createElement('style');
                        asyncStyle.media = 'screen';
                        asyncStyle.classList.add('dark-reader-style');
                        asyncStyle.classList.add('dark-reader-style--async');
                        asyncStyle.textContent = [
                            media && `@media ${media} {`,
                            `${selector} {`,
                            `    ${property}: ${asyncValue} !important;`,
                            '}',
                            media && '}',
                        ].filter((x) => x).join('\n');
                        document.head.appendChild(asyncStyle);
                    });
                } else {
                    lines.push(`    ${property}: ${modified} !important;`);
                }
            } else {
                lines.push(`    ${property}: ${value} !important;`);
            }
        });
        lines.push('}');
        if (media) {
            lines.push('}')
        }
    });

    style.textContent = lines.join('\n');
    document.head.insertBefore(style, null);
    Array.from(document.querySelectorAll('.dark-reader-style--async')).forEach((el) => el.parentElement && el.parentElement.removeChild(el));
}

function shouldAnalyzeStyle(node: Node) {
    return (
        (
            (node instanceof HTMLStyleElement) ||
            (node instanceof HTMLLinkElement && node.rel === 'stylesheet')
        ) && (
            !node.classList.contains('dark-reader-style') ||
            node.classList.contains('dark-reader-style--cors')
        )
    );
}

const loadingStyles = new WeakSet<Node>();

async function replaceCORSStyle(link: HTMLLinkElement, filter: FilterConfig) {
    const url = link.href;
    loadingStyles.add(link);

    const fallback = document.createElement('style');
    fallback.classList.add('dark-reader-style');
    fallback.classList.add('dark-reader-style--fallback');
    fallback.media = 'screen';
    fallback.textContent = getModifiedFallbackStyle(filter);
    document.head.insertBefore(fallback, link.nextElementSibling);

    let text: string;
    try {
        text = await bgFetch({url, responseType: 'text'});
    } catch (err) {
        console.warn(`Unable to load CSS ${url}`);
        fallback.parentElement.removeChild(fallback);
        return;
    }

    // Replace relative paths with absolute
    const cssBasePath = getCSSBaseBath(url);
    const cssText = text
        .replace(fontFaceRegex, '')
        .replace(cssURLRegex, (match) => {
            const pathValue = getCSSURLValue(match);
            return `url("${getAbsoluteURL(cssBasePath, pathValue)}")`;
        })
        .trim();

    if (!cssText) {
        return;
    }

    const cors = document.createElement('style');
    cors.classList.add('dark-reader-style');
    cors.classList.add('dark-reader-style--cors');
    cors.media = 'screen';
    cors.dataset.uri = url;
    cors.textContent = cssText;
    link.parentElement.insertBefore(cors, link.nextElementSibling);

    fallback.parentElement.removeChild(fallback);
}

let styleChangeObserver: MutationObserver = null;
const linksSubscriptions = new Map<Element, () => void>();

function watchForLinksLoading(filter: FilterConfig) {
    stopWatchingForLinksLoading();
    const onLoad = () => state.watching && createTheme(filter);
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    links.forEach((link) => {
        link.addEventListener('load', onLoad);
        linksSubscriptions.set(link, onLoad);
        if (link.parentElement !== document.head) {
            document.head.insertBefore(link, document.getElementById('dark-reader-style'));
        }
        if (!loadingStyles.has(link)) {
            try {
                const rules = (link.sheet as any).cssRules;
            } catch (err) {
                console.warn(err);
                replaceCORSStyle(link, filter);
            }
        }
    });
}

function stopWatchingForLinksLoading() {
    linksSubscriptions.forEach((listener, link) => link.removeEventListener('load', listener));
    linksSubscriptions.clear();
}

function createThemeAndWatchForUpdates(filter: FilterConfig) {
    createTheme(filter);
    state.watching = true;
    watchForLinksLoading(filter);
    if (styleChangeObserver) {
        styleChangeObserver.disconnect();
    }
    styleChangeObserver = new MutationObserver((mutations) => {
        const styleMutations = mutations.filter((m) => {
            return Array.from(m.addedNodes)
                .concat(Array.from(m.removedNodes))
                .some((n: Element) => shouldAnalyzeStyle(n));
        });
        if (styleMutations.length > 0) {
            createTheme(filter);
            watchForLinksLoading(filter);
        }
    });
    styleChangeObserver.observe(document.head, {childList: true, attributes: true, characterData: true});
    document.body && styleChangeObserver.observe(document.body, {childList: true, attributes: true, characterData: true});
}

function stopWatchingForUpdates() {
    state.watching = false;
    if (styleChangeObserver) {
        styleChangeObserver.disconnect();
        styleChangeObserver = null;
    }
}

export function createOrUpdateDynamicTheme(filter: FilterConfig) {
    if (document.head) {
        createThemeAndWatchForUpdates(filter);
    } else {
        const headObserver = new MutationObserver(() => {
            if (document.head) {
                headObserver.disconnect();
                createThemeAndWatchForUpdates(filter);
            }
        });
        headObserver.observe(document, {childList: true, subtree: true});
    }
}

export function removeDynamicTheme() {
    removeStyle();
    Array.from(document.querySelectorAll('.dark-reader-style')).forEach((el) => el.parentElement && el.parentElement.removeChild(el));
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach((el) => loadingStyles.delete(el));
    stopWatchingForUpdates();
    stopWatchingForLinksLoading();
}

export function cleanDynamicThemeCache() {
    cleanModificationCache();
    stopWatchingForUpdates();
    stopWatchingForLinksLoading();
}
