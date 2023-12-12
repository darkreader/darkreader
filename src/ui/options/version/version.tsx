import {m} from 'malevic';

let appVersion: string;

export function AppVersion(): Malevic.Child {
    if (!appVersion) {
        appVersion = chrome.runtime.getManifest().version;
    }
    return (
        <label class="darkreader-version">Version 5 Preview ({appVersion})</label>
    );
}
