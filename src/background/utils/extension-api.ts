
declare const browser: {
    commands: {
        update({name, shortcut}): void;
    }
};

export function canInjectScript(url: string) {
    return (url
        && url.indexOf('chrome') !== 0
        && url.indexOf('https://chrome.google.com/webstore') !== 0
    );
}

export function getFontList() {
    return new Promise<string[]>((resolve) => {
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
