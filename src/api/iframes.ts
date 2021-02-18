import type {DynamicThemeFix, Theme} from 'definitions';

export function getAllIFrames(workingDocument = document): HTMLIFrameElement[] {
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
        if ((IFrame.contentWindow as any).DarkReader) {
            contentDocument.dispatchEvent(new CustomEvent('__darkreader__enableDynamicTheme', {detail: getStore()}));
        } else {
            const dispatchCustomEvent = () => {
                if (isEnabled()) {
                    contentDocument.dispatchEvent(new CustomEvent('__darkreader__enableDynamicTheme', {detail: getStore()}));
                    contentDocument.removeEventListener('__darkreader__IAmReady', dispatchCustomEvent);
                }
            };
            contentDocument.addEventListener('__darkreader__IAmReady', dispatchCustomEvent);
        }
    }
};

const isDOMReady = (IFrameDocument: Document) => IFrameDocument.readyState === 'complete' || IFrameDocument.readyState === 'interactive';

const onMutation = (workingDocument: Document) => {
    getAllIFrames(workingDocument).forEach((IFrame) => {
        if (!IFrame.getAttribute('isdarkreaderactived')) {
            const onReadyStateChange = () => {
                if (isDOMReady(IFrame.contentDocument)) {
                    IFrame.contentDocument.removeEventListener('readystatechange', onReadyStateChange);
                    IFrame.removeEventListener('load', onReadyStateChange);
                    onNewIFrame(IFrame);
                }
            };
            IFrame.contentDocument.addEventListener('readystatechange', onReadyStateChange);
            IFrame.addEventListener('load', onReadyStateChange);
            onReadyStateChange();
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
