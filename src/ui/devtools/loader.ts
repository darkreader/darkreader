import type {DevToolsPanelSettings} from 'definitions';
import {DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY} from '../connect/connector';

enum PanelState {
    NONE,
    CREATING,
    EXISTS
}

let panelState: PanelState = PanelState.NONE;

function createPanelIfNeeded(data: DevToolsPanelSettings | undefined) {
    if ((data && data.enabled === false) || panelState !== PanelState.NONE) {
        return;
    }
    panelState = PanelState.CREATING;
    chrome.devtools.panels.create(
        'Dark Reader',
        'ui/assets/images/mode-dark-32.svg',
        'ui/devtools/index.html',
        () => panelState = PanelState.EXISTS
    );
}

chrome.storage.local.get(DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY).then((storage) => {
    createPanelIfNeeded(storage.DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY);
});

chrome.storage.onChanged.addListener((changes) => {
    const change = changes[DEVTOOLS_PANEL_SETTINGS_STORAGE_KEY];
    if (!change) {
        return;
    }
    createPanelIfNeeded(change.newValue);
});
