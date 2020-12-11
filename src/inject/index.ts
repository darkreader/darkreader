import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logInfo, logWarn} from './utils/log';
import {watchForColorSchemeChange} from './utils/watch-color-scheme';
import {collectCSS} from './dynamic-theme/css-collection';
import {fallBackStyle, removeFallbackSheet} from './dynamic-theme/adopted-style-manger';

function onMessage({type, data}) {
    switch (type) {
        case 'add-css-filter':
        case 'add-static-theme': {
            const css = data;
            removeDynamicTheme();
            createOrUpdateStyle(css);
            break;
        }
        case 'add-svg-filter': {
            const {css, svgMatrix, svgReverseMatrix} = data;
            removeDynamicTheme();
            createOrUpdateSVGFilter(svgMatrix, svgReverseMatrix);
            createOrUpdateStyle(css);
            break;
        }
        case 'add-dynamic-theme': {
            const {filter, fixes, isIFrame} = data;
            removeStyle();
            createOrUpdateDynamicTheme(filter, fixes, isIFrame, 'extension');
            break;
        }
        case 'export-css': {
            collectCSS().then((collectedCSS) => chrome.runtime.sendMessage({type: 'export-css-response', data: collectedCSS}));
            break;
        }
        case 'unsupported-sender':
        case 'clean-up': {
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            break;
        }
    }
}

function getDataViaXhr(data: string) {
    const url = 'blob:' + chrome.runtime.getURL(data);
    try {
        // Remove the cookie
        document.cookie = `${chrome.runtime.id}=1; max-age=0`;
        const xhr = new XMLHttpRequest();
        // Synchronous XHR request so it won't affect performance.
        xhr.open('GET', url, false);
        xhr.send();
        URL.revokeObjectURL(url);
        return JSON.parse(xhr.response);
    } catch (err) {
        logWarn(err);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function getXhrBlobID() {
    try {
        // Getting the cookie of a document can fail on sandboxed frames.
        const {cookie} = document;
        return new RegExp(`(^|\\s|;)${chrome.runtime.id}=\\s*([-\\w]+)\\s*(;|$)`).exec(cookie)[2];
    } catch (err) {
        logWarn(err);
    }
}


// TODO: Use background page color scheme watcher when browser bugs fixed.
const colorSchemeWatcher = watchForColorSchemeChange(({isDark}) => {
    logInfo('Media query was changed');
    chrome.runtime.sendMessage({type: 'color-scheme-change', data: {isDark}});
});

const port = chrome.runtime.connect({name: 'tab'});
port.onMessage.addListener(onMessage);
port.onDisconnect.addListener(() => {
    logWarn('disconnect');
    cleanDynamicThemeCache();
    colorSchemeWatcher.disconnect();
});

const blobID = getXhrBlobID();
const data = blobID && getDataViaXhr(blobID);
if (Array.isArray(document.adoptedStyleSheets) && fallBackStyle && data && data.type !== 'clean-up' && data.type !== 'unsupported-sender') {
    fallBackStyle.insertRule('html, body, body :not(iframe) { background-color: #181a1b !important; border-color: #776e62 !important; color: #e8e6e3 !important; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, fallBackStyle];
}
if (data) {
    onMessage(data);
} else {
    removeFallbackSheet();
}
