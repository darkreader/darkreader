import { Extension, FilterConfig, TabInfo } from '../../definitions';

export default function createExtensionMock() {
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
        setConfig(config) {
            Object.assign(extension.config, config);
        },
        addListener(callback) { },
        removeListener(callback) { },
        getActiveTabInfo(callback) {
            callback({
                url: 'http://darkreader.org/',
                host: 'darkreader.org',
                isProtected: false,
                isInDarkList: false,
            });
        },
        toggleCurrentSite() { },
    };
    return extension;
}
