export function isFirefox() {
    return navigator.userAgent.indexOf('Firefox') >= 0;
}

export function simpleClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function canInjectScript(url: string) {
    if (isFirefox()) {
        return (url
            && url.indexOf('about:') !== 0
            && url.indexOf('view-source:') !== 0
            && url.indexOf('https://addons.mozilla.org') !== 0
        );
    }
    return (url
        && url.indexOf('chrome') !== 0
        && url.indexOf('https://chrome.google.com/webstore') !== 0
    );
}

export function getFontList() {
    return new Promise<string[]>((resolve) => {
        if (!chrome.fontSettings) {
            // Todo: Remove it as soon as Firefox and Edge get support.
            resolve([
                'serif',
                'sans-serif',
                'monospace',
                'cursive',
                'fantasy',
                'system-ui'
            ]);
            return;
        }
        chrome.fontSettings.getFontList((list) => {
            const fonts = list.map((f) => f.fontId);
            resolve(fonts);
        });
    });
}
