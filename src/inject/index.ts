import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logInfo, logWarn} from './utils/log';
import {watchForColorSchemeChange} from './utils/watch-color-scheme';
import {collectCSS} from './dynamic-theme/css-collection';

function onMessage({type, data}) {
    switch (type) {
        case 'add-css-filter':
        case 'add-static-theme': {
            const css = data;
            removeDynamicTheme();
            createOrUpdateStyle(css, type === 'add-static-theme' ? 'static' : 'filter');
            break;
        }
        case 'add-svg-filter': {
            const {css, svgMatrix, svgReverseMatrix} = data;
            removeDynamicTheme();
            createOrUpdateSVGFilter(svgMatrix, svgReverseMatrix);
            createOrUpdateStyle(css, 'filter');
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
        case 'reload':
            logWarn('Cleaning up before update');
            removeEventListener('pagehide', onPageHide);
            removeEventListener('freeze', onFreeze);
            removeEventListener('resume', onResume);
            cleanDynamicThemeCache();
            colorSchemeWatcher.disconnect();
            break;
    }
}

// TODO: Use background page color scheme watcher when browser bugs fixed.
const colorSchemeWatcher = watchForColorSchemeChange(({isDark}) => {
    logInfo('Media query was changed');
    chrome.runtime.sendMessage({type: 'color-scheme-change', data: {isDark}});
});

chrome.runtime.onMessage.addListener(onMessage);
chrome.runtime.sendMessage({type: 'frame-connect'});

function onPageHide(e) {
    if (e.persisted === false) {
        chrome.runtime.sendMessage({type: 'frame-forget'});
    }
}

function onFreeze() {
    chrome.runtime.sendMessage({type: 'frame-freeze'});
}

function onResume() {
    chrome.runtime.sendMessage({type: 'frame-resume'});
}

addEventListener('pagehide', onPageHide);
addEventListener('freeze', onFreeze);
addEventListener('resume', onResume);
