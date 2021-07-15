import type {DynamicThemeFix, Theme} from 'definitions';
import {getDuration} from '../utils/time';

export function getAllIFrames(workingDocument: Document): HTMLIFrameElement[] {
    if (!workingDocument) {
        return [];
    }
    let IFrames: HTMLIFrameElement[] = [];
    IFrames = [...IFrames, ...workingDocument.getElementsByTagName('iframe')];
    // Recursive checking IFrames.
    IFrames.forEach((IFrame) => {
        IFrames = [...IFrames, ...getAllIFrames(IFrame.contentDocument)];
    });
    return IFrames;
}

let IFrameDetectedCallback: (IFrameDocument: Document) => void = null;
let isEnabled: () => boolean;
let getStore: () => {theme: Theme; fixes: DynamicThemeFix};

const onNewIFrame = (IFrame: HTMLIFrameElement) => {
    const {contentDocument} = IFrame;
    IFrameDetectedCallback(contentDocument);
    setupIFrameObserver(contentDocument);
    IFrame.setAttribute('isdarkreaderactived', '1');
    if (isEnabled()) {
        // Cannot ensure darkreader.js has been loaded.
        contentDocument.dispatchEvent(new CustomEvent('__darkreader__enableDynamicTheme', {detail: getStore()}));
        const dispatchCustomEvent = () => {
            if (isEnabled()) {
                contentDocument.dispatchEvent(new CustomEvent('__darkreader__enableDynamicTheme', {detail: getStore()}));
                contentDocument.removeEventListener('__darkreader__IAmReady', dispatchCustomEvent);
            }
        };
        contentDocument.addEventListener('__darkreader__IAmReady', dispatchCustomEvent);
    }
};

const onMutation = (workingDocument: Document) => {
    getAllIFrames(workingDocument).forEach((IFrame) => {
        if (!IFrame.getAttribute('isdarkreaderactived')) {
            ensureIFrameIsLoaded(IFrame, () => !IFrame.getAttribute('isdarkreaderactived') && onNewIFrame(IFrame));
        }
    });
};

export function setupIFrameData(listener: (IFrameDocument: Document) => void, getOptions: () => {theme: Theme; fixes: DynamicThemeFix}, isDarkReaderEnabled: () => boolean) {
    IFrameDetectedCallback = listener;
    getStore = getOptions;
    isEnabled = isDarkReaderEnabled;
    // Trigger an Mutation to enable Dark Reader on all IFrames.
    onMutation(document);
}

export function setupIFrameObserver(workingDocument = document) {
    const observerDocument = workingDocument;
    const observer = new MutationObserver(() => {
        onMutation(observerDocument);
    });
    observer.observe(observerDocument.documentElement, {childList: true, subtree: true});
}

const maxTimeoutDuration = getDuration({seconds: 5});

export function ensureIFrameIsLoaded(IFrame: HTMLIFrameElement, callback: (IFrameDocument: Document) => void): void {
    let timeoutID: number;
    let maxTimeoutID: number;
    let fired = false;

    function ready() {
        if (!fired) {
            fired = true;
            clearTimeout(timeoutID);
            callback(IFrame.contentDocument);
        }
    }

    // use iFrame load as a backup - though the other events should occur first
    IFrame.addEventListener('load', () => {
        ready();
    });

    function checkLoaded() {
        const doc = IFrame.contentDocument;
        // We can tell if there is a dummy document installed because the dummy document
        // will have an URL that starts with "about:".  The real document will not have that URL
        if (doc && doc.URL.indexOf('about:') !== 0) {
            if (doc.readyState === 'complete') {
                ready.call(doc);
            } else {
                // set event listener for DOMContentLoaded on the new document
                doc.addEventListener('DOMContentLoaded', ready);
                doc.addEventListener('readystatechange', ready);
            }
        } else {
            // Still the same old original document, so keep looking for content or new document
            timeoutID = setTimeout(checkLoaded);

            // Let's not endlessly wait on a document if it won't load.
            // Due to browser reasons.
            if (!maxTimeoutID) {
                setTimeout(() => {
                    clearTimeout(timeoutID);
                }, maxTimeoutDuration);
            }
        }
    }
    checkLoaded();
}

export const isIFrame = (() => {
    try {
        return window.self !== window.top;
    } catch (err) {
        console.warn(err);
        return true;
    }
})();
