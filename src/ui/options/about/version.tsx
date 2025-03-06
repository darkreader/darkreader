import {m} from 'malevic';

import {getLocalMessage} from '../../../utils/locales';

let appVersion: string;

export function AppVersion(): Malevic.Child {
    if (!appVersion) {
        appVersion = chrome.runtime.getManifest().version;
    }
    return (
        <label class="darkreader-version">{getLocalMessage('version')} {appVersion}</label>
    );
}
