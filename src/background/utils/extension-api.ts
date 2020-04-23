import {isFirefox, isEdge} from '../../utils/platform';

declare const browser: {
    commands: {
        update({name, shortcut}): void;
    };
};

export function canInjectScript(url: string) {
    if (isFirefox()) {
        return (url
            && !url.startsWith('about:')
            && !url.startsWith('moz')
            && !url.startsWith('view-source:')
            && !url.startsWith('https://addons.mozilla.org')
        );
    }
    if (isEdge()) {
        return (url
            && !url.startsWith('chrome')
            && !url.startsWith('edge')
            && !url.startsWith('https://chrome.google.com/webstore')
            && !url.startsWith('https://microsoftedge.microsoft.com/addons')
        );
    }
    return (url
        && !url.startsWith('chrome')
        && !url.startsWith('https://chrome.google.com/webstore')
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

export function getCommands() {
    return new Promise<chrome.commands.Command[]>((resolve) => {
        if (!chrome.commands) {
            resolve([]);
            return;
        }
        chrome.commands.getAll((commands) => {
            if (commands) {
                resolve(commands);
            } else {
                resolve([]);
            }
        });
    });
}

export function setShortcut(command: string, shortcut: string) {
    if (typeof browser !== 'undefined' && browser.commands && browser.commands.update) {
        browser.commands.update({name: command, shortcut});
    }
}
