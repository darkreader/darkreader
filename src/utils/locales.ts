export function getLocalMessage(messageName: string) {
    return chrome.i18n.getMessage(messageName);
};
