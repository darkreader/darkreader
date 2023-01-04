import type {RequestListener} from 'http';
import type {Page, WaitForOptions} from 'puppeteer-core';
import type {ExtensionData, UserSettings} from '../../src/definitions';

type PathsObject = {[path: string]: string | RequestListener | PathsObject};

declare global {
    const loadTestPage: (paths: PathsObject & {cors?: PathsObject}, gotoOptions?: WaitForOptions) => Promise<void>;
    const corsURL: string;
    const page: Page;
    const popupUtils: {
        click: (selector: string) => Promise<void>;
        exists: (selector: string) => Promise<boolean>;
    };
    const devtoolsUtils: {
        paste: (fixes: string) => Promise<void>;
        reset: () => Promise<void>;
    };
    const backgroundUtils: {
        changeSettings: (settings: Partial<UserSettings>) => Promise<void>;
        collectData: () => Promise<ExtensionData>;
        changeChromeStorage: (region: 'local' | 'sync', data: {[key: string]: any}) => Promise<void>;
        getChromeStorage: (region: 'local' | 'sync', keys: string[]) => Promise<{[key: string]: any}>;
        emulateMedia: (name: string, value: string) => Promise<void>;
        getManifest: () => Promise<chrome.runtime.Manifest>;
    };
}
