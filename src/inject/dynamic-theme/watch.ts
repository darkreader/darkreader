import {shouldManageStyle, STYLE_SELECTOR} from './style-manager';


let observer: MutationObserver = null;

interface ChangedStyles {
    created: (HTMLStyleElement | HTMLLinkElement)[];
    updated: (HTMLStyleElement | HTMLLinkElement)[];
    removed: (HTMLStyleElement | HTMLLinkElement)[];
}

function getAllManageableStyles(nodes: ArrayLike<Node>) {
    const results: (HTMLLinkElement | HTMLStyleElement)[] = [];
    Array.from(nodes).forEach((node) => {
        if (node instanceof Element) {
            if (shouldManageStyle(node)) {
                results.push(node as HTMLLinkElement | HTMLStyleElement);
            }
            results.push(...Array.from<HTMLLinkElement | HTMLStyleElement>(node.querySelectorAll(STYLE_SELECTOR)).filter(shouldManageStyle));
        }
    });
    return results;
}

function iterateShadowNodes(nodes: ArrayLike<Node>, iterator: (node: Element) => void) {
    Array.from(nodes).forEach((node) => {
        if (node instanceof Element) {
            if (node.shadowRoot) {
                iterator(node);
            }
            iterateShadowNodes(node.childNodes, iterator);
        }
    });
}

const shadowObservers = new Set<MutationObserver>();

export function watchForStyleChanges(update: (styles: ChangedStyles) => void) {
    if (observer) {
        observer.disconnect();
        shadowObservers.forEach((o) => o.disconnect());
        shadowObservers.clear();
    }

    function handleMutations(mutations: MutationRecord[]) {
        const createdStyles = mutations.reduce((nodes, m) => nodes.concat(getAllManageableStyles(m.addedNodes)), []);
        const removedStyles = mutations.reduce((nodes, m) => nodes.concat(getAllManageableStyles(m.removedNodes)), []);
        const updatedStyles = mutations
            .filter(({target, type}) => type === 'attributes' && shouldManageStyle(target))
            .reduce((styles, {target}) => {
                styles.push(target as HTMLStyleElement | HTMLLinkElement);
                return styles;
            }, [] as (HTMLStyleElement | HTMLLinkElement)[]);

        if (createdStyles.length + removedStyles.length + updatedStyles.length > 0) {
            update({
                created: createdStyles,
                updated: updatedStyles,
                removed: removedStyles,
            });
        }

        iterateShadowNodes(mutations.reduce((nodes, m) => nodes.concat(Array.from(m.addedNodes)), []), subscribeForShadowRootChanges);
    }

    function subscribeForShadowRootChanges(node: Element) {
        const shadowObserver = new MutationObserver(handleMutations);
        shadowObserver.observe(node.shadowRoot, mutationObserverOptions);
        shadowObservers.add(shadowObserver);
    }

    const mutationObserverOptions = {childList: true, subtree: true, attributes: true, attributeFilter: ['rel']};
    observer = new MutationObserver(handleMutations);
    observer.observe(document.documentElement, mutationObserverOptions);
    iterateShadowNodes(document.documentElement.children, subscribeForShadowRootChanges);
}

export function stopWatchingForStyleChanges() {
    if (observer) {
        observer.disconnect();
        observer = null;
        shadowObservers.forEach((o) => o.disconnect());
        shadowObservers.clear();
    }
}
