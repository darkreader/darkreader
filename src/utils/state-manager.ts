/**
 * This class exists only to simplify Jest testing of the real implementation
 * which is in StateManagerImpl class.
 */

import {isNonPersistent} from './migration';
import {StateManagerImpl} from './state-manager-impl';

export class StateManager<T> {
    private stateManager: StateManagerImpl<T> | null;

    constructor(localStorageKey: string, parent: any, defaults: T){
        if (isNonPersistent()) {
            function addListener(listener: (data: T) => void) {
                chrome.storage.onChanged.addListener((changes, areaName) => {
                    if (areaName !== 'local' || !changes[localStorageKey]) {
                        return;
                    }
                    listener(changes[localStorageKey].newValue);
                });
            }

            this.stateManager = new StateManagerImpl(
                localStorageKey,
                parent,
                defaults,
                chrome.storage.local,
                addListener
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
