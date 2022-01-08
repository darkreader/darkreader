// @ts-check
import {isFirefox} from '../../utils/platform';
import {MessageType} from '../../utils/message';

/** @typedef {import('../../definitions').ExtensionActions} ExtensionActions */
/** @typedef {import('../../definitions').ExtensionData} ExtensionData */
/** @typedef {import('../../definitions').Message} Message */
/** @typedef {import('../../definitions').TabInfo} TabInfo */
/** @typedef {import('../../definitions').Theme} Theme */
/** @typedef {import('../../definitions').UserSettings} UserSettings */

/**
 * @implements {ExtensionActions}
 */
export default class Connector {
    /** @type {Set<(data: ExtensionData) => void>} */
    #changeSubscribers;

    constructor() {
        this.#changeSubscribers = new Set();
    }

    /**
     * @template T
     * @param {string} type
     * @param {string} [data]
     * @returns {Promise<T>}
     */
    async #sendRequest(type, data) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({type, data}, ({data, error}) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
     * @template T
     * @param {string} type
     * @param {string} [data]
     * @returns {Promise<T>}
     */
    async #firefoxSendRequestWithResponse(type, data) {
        return new Promise((resolve, reject) => {
            const dataPort = chrome.runtime.connect({name: type});
            dataPort.onDisconnect.addListener(() => reject());
            dataPort.onMessage.addListener(({data, error}) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(data);
                }
                dataPort.disconnect();
            });
            data && dataPort.postMessage({data});
        });
    }

    async getData() {
        if (isFirefox) {
            return await this.#firefoxSendRequestWithResponse(MessageType.UI_GET_DATA);
        }
        return await this.#sendRequest(MessageType.UI_GET_DATA);
    }

    /**
     * @returns {Promise<TabInfo>}
     */
    async getActiveTabInfo() {
        if (isFirefox) {
            return await this.#firefoxSendRequestWithResponse(MessageType.UI_GET_ACTIVE_TAB_INFO);
        }
        return await this.#sendRequest(MessageType.UI_GET_ACTIVE_TAB_INFO);
    }

    /** @type {(message: Message) => void} */
    #onChangesReceived = ({type, data}) => {
        if (type === MessageType.BG_CHANGES) {
            this.#changeSubscribers.forEach((callback) => callback(data));
        }
    };

    /**
     * @param {(data: ExtensionData) => void} callback 
     */
    subscribeToChanges(callback) {
        this.#changeSubscribers.add(callback);
        if (this.#changeSubscribers.size === 1) {
            chrome.runtime.onMessage.addListener(this.#onChangesReceived);
            chrome.runtime.sendMessage({type: MessageType.UI_SUBSCRIBE_TO_CHANGES});
        }
    }

    /**
     * @param {string} command
     * @param {string} shortcut
     */
    setShortcut(command, shortcut) {
        chrome.runtime.sendMessage({type: MessageType.UI_SET_SHORTCUT, data: {command, shortcut}});
    }

    /**
     * @param {Partial<UserSettings>} settings
     */
    changeSettings(settings) {
        chrome.runtime.sendMessage({type: MessageType.UI_CHANGE_SETTINGS, data: settings});
    }

    /**
     * @param {Partial<Theme>} theme
     */
    setTheme(theme) {
        chrome.runtime.sendMessage({type: MessageType.UI_SET_THEME, data: theme});
    }

    /**
     * @param {string} url
     */
    toggleURL(url) {
        chrome.runtime.sendMessage({type: MessageType.UI_TOGGLE_URL, data: url});
    }

    /**
     * @param {string[]} ids
     */
    markNewsAsRead(ids) {
        chrome.runtime.sendMessage({type: MessageType.UI_MARK_NEWS_AS_READ, data: ids});
    }

    /**
     * @param {{local: boolean}} options
     */
    loadConfig(options) {
        chrome.runtime.sendMessage({type: MessageType.UI_LOAD_CONFIG, data: options});
    }

    /**
     * @param {string} text 
     * @returns {Promise<void>}
     */
    async applyDevDynamicThemeFixes(text) {
        if (isFirefox) {
            return await this.#firefoxSendRequestWithResponse(MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES, text);
        }
        return await this.#sendRequest(MessageType.UI_APPLY_DEV_DYNAMIC_THEME_FIXES, text);
    }

    resetDevDynamicThemeFixes() {
        chrome.runtime.sendMessage({type: MessageType.UI_RESET_DEV_DYNAMIC_THEME_FIXES});
    }

    /**
     * @param {string} text 
     * @returns {Promise<void>}
     */
    async applyDevInversionFixes(text) {
        if (isFirefox) {
            return await this.#firefoxSendRequestWithResponse(MessageType.UI_APPLY_DEV_INVERSION_FIXES, text);
        }
        return await this.#sendRequest(MessageType.UI_APPLY_DEV_INVERSION_FIXES, text);
    }

    resetDevInversionFixes() {
        chrome.runtime.sendMessage({type: MessageType.UI_RESET_DEV_INVERSION_FIXES});
    }

    /**
     * @param {string} text 
     * @returns {Promise<void>}
     */
    async applyDevStaticThemes(text) {
        if (isFirefox) {
            return await this.#firefoxSendRequestWithResponse(MessageType.UI_APPLY_DEV_STATIC_THEMES, text);
        }
        return await this.#sendRequest(MessageType.UI_APPLY_DEV_STATIC_THEMES, text);
    }

    resetDevStaticThemes() {
        chrome.runtime.sendMessage({type: MessageType.UI_RESET_DEV_STATIC_THEMES});
    }

    disconnect() {
        if (this.#changeSubscribers.size > 0) {
            this.#changeSubscribers.clear();
            chrome.runtime.onMessage.removeListener(this.#onChangesReceived);
            chrome.runtime.sendMessage({type: MessageType.UI_UNSUBSCRIBE_FROM_CHANGES});
        }
    }
}
