import {Extension, FilterConfig, TabInfo} from '../../definitions';

export function getExtension() {
    // Edge fix
    if (!window.chrome) {
        window.chrome = {} as any;
    }
    if (chrome && !chrome.extension && (window as any).browser && (window as any).browser.extension) {
        chrome.extension = (window as any).browser.extension;
    }

    let extension: Extension;
    if (chrome.extension) {
        const bgPage = chrome.extension.getBackgroundPage() as any;
        if (bgPage) {
            extension = bgPage.DarkReader.Background.extension;
        }
    }
    if (!extension) {
        extension = createExtensionMock();
    }

    return extension;
}

export function createExtensionMock() {
    let listener: () => void = null;
    const extension: Extension = {
        enabled: true,
        ready: true,
        filterConfig: {
            mode: 1,
            brightness: 110,
            contrast: 90,
            grayscale: 20,
            sepia: 10,
            useFont: false,
            fontFamily: 'Segoe UI',
            textStroke: 0,
            invertListed: false,
            siteList: []
        },
        fonts: [
            'serif',
            'sans-serif',
            'monospace',
            'cursive',
            'fantasy',
            'system-ui'
        ],
        enable() {
            extension.enabled = true;
            listener();
        },
        disable() {
            extension.enabled = false;
            listener();
        },
        setConfig(config) {
            Object.assign(extension.filterConfig, config);
            listener();
        },
        addListener(callback) {
            listener = callback;
        },
        removeListener(callback) {
            listener = null;
        },
        getActiveTabInfo(callback) {
            callback({
                url: 'http://darkreader.org/',
                host: 'darkreader.org',
                isProtected: false,
                isInDarkList: false,
            });
        },
        toggleCurrentSite() {
            extension.filterConfig.siteList.length ?
                extension.filterConfig.siteList.splice(0) :
                extension.filterConfig.siteList.push('darkreader.org');
            listener();
        },
        getDevInversionFixesText() {
            return `${JSON.stringify({common: {invert: 'img, iframe'}, sites: [{url: 'google.*', invert: '.icon'}]}, null, 4)}\n`;
        }
    };
    return extension;
}
