import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logInfo, logWarn} from '../utils/log';
import {watchForColorSchemeChange} from './utils/watch-color-scheme';
import {collectCSS} from './dynamic-theme/css-collection';
import type {Message} from '../definitions';
import {MessageType} from '../utils/message';
import {isThunderbird} from '../utils/platform';

let unloaded = false;

// TODO: Use background page color scheme watcher when browser bugs fixed.
let colorSchemeWatcher = watchForColorSchemeChange(({isDark}) => {
    logInfo('Media query was changed');
    sendMessage({type: MessageType.CS_COLOR_SCHEME_CHANGE, data: {isDark}});
});

function cleanup() {
    unloaded = true;
    removeEventListener('pagehide', onPageHide);
    removeEventListener('freeze', onFreeze);
    removeEventListener('resume', onResume);
    cleanDynamicThemeCache();
    if (colorSchemeWatcher) {
        colorSchemeWatcher.disconnect();
        colorSchemeWatcher = null;
    }
}

function sendMessage(message: Message) {
    if (unloaded) {
        return;
    }
    try {
        chrome.runtime.sendMessage<Message>(message, (response) => {
            // Vivaldi bug workaround. See TabManager for details.
            if (response === 'unsupportedSender') {
                removeStyle();
                removeSVGFilter();
                removeDynamicTheme();
                cleanup();
            }
        });
    } catch (e) {
        /*
         * Background can be unreachable if:
         *  - extension was disabled
         *  - extension was uninstalled
         *  - extension was updated and this is the old instance of content script
         */
        cleanup();
    }
}

function onMessage({type, data}: Message) {
    logInfo('onMessage', type, data);
    switch (type) {
        case MessageType.BG_ADD_CSS_FILTER:
        case MessageType.BG_ADD_STATIC_THEME: {
            const css = data;
            removeDynamicTheme();
            createOrUpdateStyle(css, type === MessageType.BG_ADD_STATIC_THEME ? 'static' : 'filter');
            break;
        }
        case MessageType.BG_ADD_SVG_FILTER: {
            const {css, svgMatrix, svgReverseMatrix} = data;
            removeDynamicTheme();
            createOrUpdateSVGFilter(svgMatrix, svgReverseMatrix);
            createOrUpdateStyle(css, 'filter');
            break;
        }
        case MessageType.BG_ADD_DYNAMIC_THEME: {
            const {filter, fixes, isIFrame} = data;
            removeStyle();
            createOrUpdateDynamicTheme(filter, fixes, isIFrame);
            break;
        }
        case MessageType.BG_EXPORT_CSS: {
            collectCSS().then((collectedCSS) => sendMessage({type: MessageType.CS_EXPORT_CSS_RESPONSE, data: collectedCSS}));
            break;
        }
        case MessageType.BG_UNSUPPORTED_SENDER:
        case MessageType.BG_CLEAN_UP: {
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            break;
        }
        case MessageType.BG_RELOAD:
            logWarn('Cleaning up before update');
            cleanup();
            break;
    }
}

chrome.runtime.onMessage.addListener(onMessage);
sendMessage({type: MessageType.CS_FRAME_CONNECT});

function onPageHide(e: PageTransitionEvent) {
    if (e.persisted === false) {
        sendMessage({type: MessageType.CS_FRAME_FORGET});
    }
}

function onFreeze() {
    sendMessage({type: MessageType.CS_FRAME_FREEZE});
}

function onResume() {
    sendMessage({type: MessageType.CS_FRAME_RESUME});
}

// Thunderbird don't has "tabs", and emails aren't 'frozen' or 'cached'.
// And will currently error: `Promise rejected after context unloaded: Actor 'Conduits' destroyed before query 'RuntimeMessage' was resolved`
if (!isThunderbird) {
    addEventListener('pagehide', onPageHide);
    addEventListener('freeze', onFreeze);
    addEventListener('resume', onResume);
}
