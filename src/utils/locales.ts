export function getLocalMessage(messageName: string) {
    return chrome.i18n.getMessage(messageName);
}

export function getUILanguage() {
    const code = chrome.i18n.getUILanguage();
    if (code.endsWith('-mac')) {
        return code.substring(0, code.length - 4);
    }
    return code;
}
