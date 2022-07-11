/**
 * This class exists only to simplify Jest testing of the real implementation
 * which is in StateManagerImpl class.
 */

import {StateManagerImpl} from './state-manager-impl';

export class StateManager<T> {
    private stateManager;

    constructor(localStorageKey: string, parent: any, defaults: T){
        this.stateManager = new StateManagerImpl(localStorageKey, parent, defaults, chrome.storage.local.get, chrome.storage.local.set);
    }

    async saveState() {
        return this.stateManager.saveState();
    }

    async loadState() {
        return this.stateManager.loadState();
    }
}
