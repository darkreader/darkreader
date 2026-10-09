/**
 * This class exists only to simplify Jest testing of the real implementation
 * which is in StateManagerImpl class.
 */

import {isNonPersistent} from './platform';
import {StateManagerImpl} from './state-manager-impl';


export class StateManager<T extends Record<string, unknown>> {
    private stateManager: StateManagerImpl<T> | null;

    constructor(localStorageKey: string, parent: any, defaults: T, logWarn: (log: string) => void){
        if (isNonPersistent) {
            this.stateManager = new StateManagerImpl(
                localStorageKey,
                parent,
                defaults,
                chrome.storage.local,
                logWarn,
            );
        }
    }

    async saveState(): Promise<void> {
        if (this.stateManager) {
            return this.stateManager.saveState();
        }
    }

    async loadState(): Promise<void> {
        if (this.stateManager) {
            return this.stateManager.loadState();
        }
    }
}
