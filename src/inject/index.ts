import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logInfo, logWarn} from '../utils/log';
import {watchForColorSchemeChange} from './utils/watch-color-scheme';
import {collectCSS} from './dynamic-theme/css-collection';
import type {Message} from '../definitions';
import {MessageType} from 'utils/message';

function onMessage({type, data}: Message) {
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
            collectCSS().then((collectedCSS) => chrome.runtime.sendMessage<Message>({type: MessageType.CS_EXPORT_CSS_RESPONSE, data: collectedCSS}));
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
            removeEventListener('pagehide', onPageHide);
            removeEventListener('freeze', onFreeze);
            removeEventListener('resume', onResume);
            cleanDynamicThemeCache();
            colorSchemeWatcher.disconnect();
            break;
        default:
            // NOOP
            break;
    }
}

// TODO: Use background page color scheme watcher when browser bugs fixed.
const colorSchemeWatcher = watchForColorSchemeChange(({isDark}) => {
    logInfo('Media query was changed');
    chrome.runtime.sendMessage<Message>({type: MessageType.CS_COLOR_SCHEME_CHANGE, data: {isDark}});
});

chrome.runtime.onMessage.addListener(onMessage);
chrome.runtime.sendMessage<Message>({type: MessageType.CS_FRAME_CONNECT});

function onPageHide(e: PageTransitionEvent) {
    if (e.persisted === false) {
        chrome.runtime.sendMessage<Message>({type: MessageType.CS_FRAME_FORGET});
    }
}

function onFreeze() {
    chrome.runtime.sendMessage<Message>({type: MessageType.CS_FRAME_FREEZE});
}

function onResume() {
    chrome.runtime.sendMessage<Message>({type: MessageType.CS_FRAME_RESUME});
}

addEventListener('pagehide', onPageHide);
addEventListener('freeze', onFreeze);
addEventListener('resume', onResume);
