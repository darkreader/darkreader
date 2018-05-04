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

export function watchForStyleChanges(update: (styles: ChangedStyles) => void) {
    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
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
    });
    observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['rel']});
}

export function stopWatchingForStyleChanges() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}
