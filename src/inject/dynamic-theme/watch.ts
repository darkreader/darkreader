import {shouldManageStyle, STYLE_SELECTOR} from './style-manager';


let observer: MutationObserver = null;

interface ChangedStyles {
    created: (HTMLStyleElement | HTMLLinkElement)[];
    updated: (HTMLStyleElement | HTMLLinkElement)[];
    removed: (HTMLStyleElement | HTMLLinkElement)[];
    moved: (HTMLStyleElement | HTMLLinkElement)[];
}

function getAllManageableStyles(nodes: Iterable<Node> | ArrayLike<Node>) {
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
        const createdStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const updatedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const removedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();
        const movedStyles = new Set<HTMLLinkElement | HTMLStyleElement>();

        const additions = new Set<Node>();
        const deletions = new Set<Node>();
        const styleUpdates = new Set<HTMLLinkElement | HTMLStyleElement>();
        mutations.forEach((m) => {
            m.addedNodes.forEach((n) => additions.add(n));
            m.removedNodes.forEach((n) => deletions.add(n));
            if (m.type === 'attributes' && shouldManageStyle(m.target)) {
                styleUpdates.add(m.target as HTMLLinkElement | HTMLStyleElement);
            }
        });
        const styleAdditions = getAllManageableStyles(Array.from(additions));
        const styleDeletions = getAllManageableStyles(Array.from(deletions));

        styleDeletions.forEach((style) => {
            if (style.isConnected) {
                movedStyles.add(style);
            } else {
                removedStyles.add(style);
            }
        });
        styleUpdates.forEach((style) => {
            if (!removedStyles.has(style)) {
                updatedStyles.add(style);
            }
        });
        styleAdditions.forEach((style) => {
            if (!(removedStyles.has(style) || movedStyles.has(style) || updatedStyles.has(style))) {
                createdStyles.add(style);
            }
        });

        if (createdStyles.size + removedStyles.size + updatedStyles.size > 0) {
            update({
                created: Array.from(createdStyles),
                updated: Array.from(updatedStyles),
                removed: Array.from(removedStyles),
                moved: Array.from(movedStyles),
            });
        }

        const allAddedNodes = [];
        additions.forEach((n) => {
            if (n.isConnected) {
                allAddedNodes.push(n);
            }
        });
        iterateShadowNodes(allAddedNodes, subscribeForShadowRootChanges);
    }

    function subscribeForShadowRootChanges(node: Element) {
        const shadowObserver = new MutationObserver(handleMutations);
        shadowObserver.observe(node.shadowRoot, mutationObserverOptions);
        shadowObservers.add(shadowObserver);
    }

    const mutationObserverOptions = {childList: true, subtree: true, attributes: true, attributeFilter: ['rel', 'disabled']};
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
