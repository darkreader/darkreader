// @ts-check
/**
 * @param {string} messageName
 * @returns {string}
 */
export function getLocalMessage(messageName) {
    return chrome.i18n.getMessage(messageName);
}

export function getUILanguage() {
    /** @type {string} */
    let code;
    if ('i18n' in chrome && 'getUILanguage' in chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
        code = chrome.i18n.getUILanguage();
    } else {
        // Background serivice workers do not have access to "foreground" APIs like chrome.i18n
        code = navigator.language.split('-')[0];
    }
    if (code.endsWith('-mac')) {
        return code.substring(0, code.length - 4);
    }
    return code;
}
