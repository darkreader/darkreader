const listeners: Set<(url: string) => void> = new Set();

function navigationListener(navigateEvent: any) {
    // We do not need to react to:
    // - downloads, since the page will be replaced anyway
    // - page reloads since the current context will disappear and Dynamic Theme will be injected into the new one anew
    if (navigateEvent.downloadRequest || navigateEvent.navigationType === 'reload') {
        return;
    }

    const url = navigateEvent.destination.url;
    listeners.forEach((listener) => listener(url));
}

export function addNavigationListener(callback: (url: string) => void) {
    if ('navigation' in globalThis) {
        if (listeners.size === 0) {
            (globalThis as any).navigation.addEventListener('navigate', navigationListener, {passive: true});
        }
        listeners.add(callback);
    }
}

export function removeNavigationListener(callback: (url: string) => void) {
    if ('navigation' in globalThis) {
        listeners.delete(callback);
        if (listeners.size === 0) {
            (globalThis as any).navigation.removeEventListener('navigate', navigationListener, {passive: true});
        }
    }
}
