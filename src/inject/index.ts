import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logInfo, logWarn} from './utils/log';
import {watchForColorSchemeChange} from './utils/watch-color-scheme';
import {collectCSS} from './dynamic-theme/css-collection';
import {isChromium} from '../utils/platform';

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
            createOrUpdateDynamicTheme(filter, fixes, isIFrame);
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

function getDataViaXHR() {
    if (new RegExp(`(^|\\s|;)${chrome.runtime.id}=\\s*([-\\w]+)\\s*(;|$)`).test(document.cookie)) {
        const data = RegExp.$2;
        const url = 'blob:' + chrome.runtime.getURL(data.slice(1));
        document.cookie = `${chrome.runtime.id}=1; max-age=0`; // Remove the cookie
        let res: any;
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, false); // Synchronous XHR request.
            xhr.send();
            res = JSON.parse(xhr.response);
            URL.revokeObjectURL(url);
        } catch (err) {
            logWarn(err);
        }
        return res;
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

if (isChromium) {
    onMessage(getDataViaXHR());
}
