/**
 * This class exists only to simplify Jest testing of the real implementation
 * which is in StateManagerImpl class.
 */

import {StateManagerImpl} from './state-manager-impl';

declare const __CHROMIUM_MV3__: boolean;

export class StateManager<T> {
    private stateManager: StateManagerImpl<T> | null;

    constructor(localStorageKey: string, parent: any, defaults: T, logWarn: (log: string) => void){
        if (__CHROMIUM_MV3__) {
            function addListener(listener: (data: T) => void) {
                chrome.storage.local.onChanged.addListener((changes) => {
                    listener(changes[localStorageKey].newValue);
                });
            }

            this.stateManager = new StateManagerImpl(
                localStorageKey,
                parent,
                defaults,
                chrome.storage.local,
                addListener,
                logWarn,
            );
        }
    }

    async saveState() {
        if (this.stateManager) {
            return this.stateManager.saveState();
        }
    }

    async loadState() {
        if (this.stateManager) {
            return this.stateManager.loadState();
        }
    }
}
