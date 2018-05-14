export function getLocalMessage(messageName: string) {
    return chrome.i18n.getMessage(messageName);
}

export function getUILanguage() {
    return chrome.i18n.getUILanguage();
}
