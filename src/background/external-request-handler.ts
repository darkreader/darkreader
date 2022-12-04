import { DEFAULT_SETTINGS, DEFAULT_THEME } from "../defaults";
import { Command, ExternalConnection, ExternalRequest, FilterConfig, UserSettings } from "../definitions";
import { forEach } from "../utils/array";
import { getPreviousObject, getValidatedObject } from "../utils/object";
import UserStorage from "./user-storage";
import { logInfo, logWarn } from "./utils/log";

export class ExternalRequestHandler {
    private onCommandInternal: (command: Command, tabId: number | null, frameId: number | null, frameURL: string | null) => void;
    private changeSettings: (settings: Partial<UserSettings>, onlyUpdateActiveTab?: boolean) => void;
    private setTheme: (theme: Partial<FilterConfig>) => void;
    private connectedNativesPorts: Map<string, chrome.runtime.Port> = new Map();

    constructor(onCommandInternal: (command: Command, tabId: number | null, frameId: number | null, frameURL: string | null) => void, changeSettings: (settings: Partial<UserSettings>, onlyUpdateActiveTab?: boolean) => void, setTheme: (theme: Partial<FilterConfig>) => void){
        this.onCommandInternal = onCommandInternal;
        this.changeSettings = changeSettings;
        this.setTheme = setTheme;
    }

    externalRequestsHandler(incomingData: ExternalRequest, origin: string) {
        const { type, data, isNative } = incomingData;
        if (type === 'toggle') {
            logInfo(`Port: ${origin}, toggled dark reader.`);
            this.onCommandInternal('toggle', null, null, null);
        }
        if (type === 'toggleCurrentSite') {
            logInfo(`Port: ${origin}, toggled the current site.`);
            this.onCommandInternal('addSite', null, null, null);
        }
        if (type === 'addSite') {
            if (!data) {
                logWarn('No data detected for addSite.');
                return;
            }
            logInfo(`Port: ${origin}, toggled ${data}`);
            this.onCommandInternal('addSite', data.tabId, data.frameId, data.frameURL);
        }
        if (type === 'changeSettings') {
            if (!data) {
                logWarn('No data detected for changeSettings.');
                return;
            }
            logInfo(`Port: ${origin}, made changes to the settings.`);
            const validatedData = getValidatedObject(data, DEFAULT_SETTINGS);
            if (!validatedData) {
                return;
            }
            this.copyShadowCopy(validatedData, origin);
            this.changeSettings(validatedData);
            logInfo('Saved', UserStorage.settings);
        }
        if (type === 'requestSettings') {
            if (!data) {
                logWarn('No data detected for requestSettings.');
                return;
            }
            logInfo(`Port: ${origin}, requested current settings.`);
            // Potentially add location settings?
            const sanitizedData = getValidatedObject(UserStorage.settings, UserStorage.settings, ['shadowCopy', 'externalConnections']);
            if (isNative) {
                chrome.runtime.sendNativeMessage(origin, { type: 'requestSettings-response', data: sanitizedData });
            } else {
                chrome.runtime.sendMessage(origin, { type: 'requestSettings-response', data: sanitizedData });
            }
        }
        if (type === 'setTheme') {
            if (!data) {
                logWarn('No data detected for setTheme.');
                return;
            }
            logInfo(`Port: ${origin}, made changes to the settings.`);
            const validatedData = getValidatedObject(data, DEFAULT_THEME);
            if (!validatedData) {
                return;
            }
            this.copyShadowCopy({ theme: validatedData } as UserSettings, origin);
            this.setTheme(validatedData);
            logInfo('Saved', UserStorage.settings.theme);
        }
        if (type === 'resetSettings') {
            const shadowCopy = UserStorage.settings.shadowCopy.find(({ id }) => id === origin);
            if (!shadowCopy) {
                logWarn('No data detected to reset settings.');
                return;
            }
            const previousSettings = getPreviousObject(shadowCopy.copy, UserStorage.settings, shadowCopy.oldSettings);
            const index = UserStorage.settings.shadowCopy.indexOf(shadowCopy);
            const newshadowCopy = UserStorage.settings.shadowCopy.slice();
            newshadowCopy.splice(index, 1);
            previousSettings ? this.changeSettings({ ...previousSettings, shadowCopy: newshadowCopy }) : this.changeSettings({ shadowCopy: newshadowCopy });
            if (isNative) {
                this.connectedNativesPorts.delete(origin);
            }
            logInfo('Resseted', UserStorage.settings);
        }
    }

    connectToNative = (native: string[] | string) => {
        if (Array.isArray(native)) {
            forEach(native, this.connectToNative);
        } else if (!this.connectedNativesPorts.has(native)) {
            const port = chrome.runtime.connectNative(native);
            this.connectedNativesPorts.set(native, port);
            port.onMessage.addListener((incomingData) => this.externalRequestsHandler(incomingData, native));
            port.onDisconnect.addListener(() => this.externalRequestsHandler({ type: 'resetSettings', isNative: true }, native));
        }
    };

    registerExternalConnections() {
        this.connectToNative(UserStorage.settings.externalConnections
            .filter((externalConnection) => externalConnection.isNative)
            .map((nativeConnection) => nativeConnection.id));
        chrome.runtime.onConnectExternal.addListener((port) => {
            if (UserStorage.settings.enableExternalConnections) {
                logInfo(`Port ${port.sender!.origin} has been connected to dark reader.`);
                port.onMessage.addListener((incomingData) => this.externalRequestsHandler(incomingData, port.sender!.origin!));
                port.onDisconnect.addListener(() => this.externalRequestsHandler({ type: 'resetSettings', isNative: false }, port.sender!.origin!));
            } else {
                logWarn(`Port: ${port.sender!.origin}, tried to make contact, but the Enable External Connections setting is not enabled and there by blocked.`);
            }
        });
    }

    cleanNatives(removedValues: ExternalConnection[]) {
        removedValues.map((entry) => entry.id)
            .forEach((entry) => {
                if (!this.connectedNativesPorts.has(entry)) {
                    return;
                }
                this.connectedNativesPorts.get(entry)!.disconnect();
                this.connectedNativesPorts.delete(entry);
            });
    }

    private copyShadowCopy(setting: Partial<UserSettings>, origin: string) {
        const newshadowCopy = UserStorage.settings.shadowCopy.slice();
        let shadowCopy = newshadowCopy.find(({id}) => id === origin);
        const index = shadowCopy ? newshadowCopy.indexOf(shadowCopy) : newshadowCopy.length;
        if (!shadowCopy) {
            newshadowCopy.push({id: origin, copy: {} as UserSettings, oldSettings: UserStorage.settings});
            shadowCopy = newshadowCopy[index];
        }
        shadowCopy.copy = {...shadowCopy.copy, ...setting};
        newshadowCopy[index] = shadowCopy;
        this.changeSettings({shadowCopy: newshadowCopy});
    }
}