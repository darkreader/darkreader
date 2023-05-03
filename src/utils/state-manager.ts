/**
 * This class exists only to simplify Jest testing of the real implementation
 * which is in StateManagerImpl class.
 */

import {StateManagerImpl} from './state-manager-impl';

import {isNonPersistent} from './platform';

export class StateManager<T extends Record<string, unknown>> {
    private stateManager: StateManagerImpl<T> | null;

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    constructor(localStorageKey: string, parent: any, defaults: T, logWarn: (log: string) => void){
        if (isNonPersistent) {
            function addListener(listener: (data: T) => void) {
                chrome.storage.local.onChanged.addListener((changes) => {
                    if (localStorageKey in changes) {
                        listener(changes[localStorageKey].newValue);
                    }
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
