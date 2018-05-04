import {shouldManageStyle} from './style-manager';


let styleChangeObserver: MutationObserver = null;

interface ChangedStyles {
    created: (HTMLStyleElement | HTMLLinkElement)[];
    updated: (HTMLStyleElement | HTMLLinkElement)[];
    removed: (HTMLStyleElement | HTMLLinkElement)[];
}

export function watchForStyleChanges(update: (styles: ChangedStyles) => void) {
    if (styleChangeObserver) {
        styleChangeObserver.disconnect();
    }

    styleChangeObserver = new MutationObserver((mutations) => {
        const createdStyles = mutations.reduce((nodes, m) => nodes.concat(Array.from(m.addedNodes).filter(shouldManageStyle)), []);
        const removedStyles = mutations.reduce((nodes, m) => nodes.concat(Array.from(m.removedNodes).filter(shouldManageStyle)), []);
        const updatedStyles = mutations
            .filter(({target}) => target && shouldManageStyle(target))
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
    styleChangeObserver.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['rel']});
}

export function stopWatchingForStyleChanges() {
    if (styleChangeObserver) {
        styleChangeObserver.disconnect();
        styleChangeObserver = null;
    }
}
