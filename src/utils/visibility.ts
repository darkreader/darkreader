/**
 * The following code contains a workaround for extensions designed to prevent page from knowing when it is hidden
 * GitHub issue: https://github.com/darkreader/darkreader/issues/10004
 * GitHub PR: https://github.com/darkreader/darkreader/pull/10047
 *
 * Doue to the intntional breakage introduced by these extensions, this utility might incorrecly report that document
 * is visible while it is not, but it will never report document as hidden while it is visible.
 *
 * This code exploits the fact that most such extensions block only a subset of Page Lifecycle API,
 * which notifies page of being hidden but not of being shown, while Dark Reader really cares only about
 * page being shown.
 * Specifically:
 *  - extensions block visibilitychange and blur event
 *  - extensions do not block focus event; browsers deliver focus event when user switches to
 *    a previously hidden tab or previously hidden window (assuming DevTools are closed so window gets the focus)
 *    if document has focus, then we can assume that it is visible
 *  - some extensions overwrite document.hidden but not document.visibilityState
 *  - Firefox has a bug: if extension overwrites document.hidden and document.visibilityState via Object.defineProperty,
 *    then Firefox will reset them to true and 'hidden' when tab is activated, but document.hasFocus() will be true
 *  - Safari supports document.visibilityState === 'prerender' which makes document.hidden === true even when document
 *    is visible to the user
 */
let documentVisibilityCallbacks: Set<() => void> = new Set();
let documentIsVisible_ = !document.hidden;
function documentVisibilityListener() {
    if (!document.hidden || document.visibilityState !== 'hidden' || document.hasFocus()) {
        stopWatchingForDocumentVisibility();
        documentIsVisible_ = true;
        const callbacks = documentVisibilityCallbacks;
        documentVisibilityCallbacks = new Set();
        callbacks.forEach((callback) => callback());
    }
}

// TODO: use EventListenerOptions class once it is updated
const listenerOptions: any = {
    capture: true,
    passive: true,
};
function watchForDocumentVisibility() {
    document.addEventListener('visibilitychange', documentVisibilityListener, listenerOptions);
    window.addEventListener('pageshow', documentVisibilityListener, listenerOptions);
    window.addEventListener('focus', documentVisibilityListener, listenerOptions);
}

function stopWatchingForDocumentVisibility() {
    document.removeEventListener('visibilitychange', documentVisibilityListener, listenerOptions);
    window.removeEventListener('pageshow', documentVisibilityListener, listenerOptions);
    window.removeEventListener('focus', documentVisibilityListener, listenerOptions);
}

export function addDocumentVisibilityListener(callback: () => void) {
    if (documentVisibilityCallbacks.size === 0) {
        watchForDocumentVisibility();
    }
    documentVisibilityCallbacks.add(callback);
}

export function removeDocumentVisibilityListener(callback: () => void) {
    if (documentVisibilityCallbacks.delete(callback) && documentVisibilityCallbacks.size === 0) {
        stopWatchingForDocumentVisibility();
    }
}

export function documentIsVisible() {
    return documentIsVisible_;
}
