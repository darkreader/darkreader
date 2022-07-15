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
            this.stateManager = new StateManagerImpl(localStorageKey, parent, defaults, chrome.storage.local.get, chrome.storage.local.set);
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
