import {Extension, FilterConfig, TabInfo} from '../../definitions';

export default function createExtensionMock() {
    let listener: () => void = null;
    const extension: Extension = {
        enabled: true,
        config: {
            mode: 1,
            brightness: 110,
            contrast: 90,
            grayscale: 20,
            sepia: 10,
            useFont: false,
            fontFamily: 'monospace',
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
            Object.assign(extension.config, config);
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
            extension.config.siteList.length ?
                extension.config.siteList.splice(0) :
                extension.config.siteList.push('darkreader.org');
            listener();
        },
    };
    return extension;
}
