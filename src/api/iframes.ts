import type {DynamicThemeFix, Theme} from 'definitions';

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
    getAllIFrames(workingDocument).forEach(async (IFrame) => {
        if (!IFrame.getAttribute('isdarkreaderactived')) {
            const loadedIFrame = await ensureIFrameIsLoaded(IFrame);
            onNewIFrame(loadedIFrame);
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


export async function ensureIFrameIsLoaded(IFrame: HTMLIFrameElement): Promise<HTMLIFrameElement> {
    const isLoaded = (IFrame: HTMLIFrameElement) => IFrame.contentDocument && (IFrame.contentDocument.readyState === 'complete' || IFrame.contentDocument.readyState === 'interactive');
    return new Promise((resolve) => {
        if (isLoaded(IFrame)) {
            return resolve(IFrame);
        } else {
            const onLoaded = () => {
                if (isLoaded(IFrame)) {
                    IFrame.removeEventListener('load', onLoaded);
                    IFrame.contentDocument.removeEventListener('readystatechange', onLoaded);
                    IFrame.contentWindow.removeEventListener('load', onLoaded);
                    resolve(IFrame);
                }
            };
            IFrame.addEventListener('load', onLoaded);
            IFrame.contentDocument && IFrame.contentDocument.addEventListener('readystatechange', onLoaded);
            IFrame.contentWindow && IFrame.contentWindow.window && IFrame.contentWindow.window.addEventListener('load', onLoaded);
            onLoaded();
        }
    });
}
