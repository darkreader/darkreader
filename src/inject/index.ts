import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {runDarkThemeDetector, stopDarkThemeDetector} from './detector';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logInfo, logWarn, logInfoCollapsed} from '../utils/log';
import {isSystemDarkScheme, runColorSchemeChangeDetector, stopColorSchemeChangeDetector} from './utils/watch-color-scheme';
import {collectCSS} from './dynamic-theme/css-collection';
import type {Message} from '../definitions';
import {MessageType} from '../utils/message';
import {isMV3, isThunderbird} from '../utils/platform';

let unloaded = false;

// TODO: Use background page color scheme watcher when browser bugs fixed.
runColorSchemeChangeDetector((isDark) => {
    logInfo('Media query was changed');
    sendMessage({type: MessageType.CS_COLOR_SCHEME_CHANGE, data: {isDark}});
});

function cleanup() {
    unloaded = true;
    removeEventListener('pagehide', onPageHide);
    removeEventListener('freeze', onFreeze);
    removeEventListener('resume', onResume);
    cleanDynamicThemeCache();
    stopDarkThemeDetector();
    stopColorSchemeChangeDetector();
}

function sendMessage(message: Message) {
    if (unloaded) {
        return;
    }
    const responseHandler = (response: 'unsupportedSender' | undefined) => {
        // Vivaldi bug workaround. See TabManager for details.
        if (response === 'unsupportedSender') {
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            cleanup();
        }
    };

    if (isMV3) {
        /*
         * Background can be unreachable if:
         *  - extension was disabled
         *  - extension was uninstalled
         *  - extension was updated and this is the old instance of content script
         */
        const promise: Promise<Message | 'unsupportedSender'> = chrome.runtime.sendMessage<Message>(message) as any;
        promise.then(responseHandler).catch(cleanup);
    } else {
        chrome.runtime.sendMessage<Message, 'unsupportedSender' | undefined>(message, responseHandler);
    }
}

function onMessage({type, data}: Message) {
    logInfoCollapsed(`onMessage[${type}]`, data);
    switch (type) {
        case MessageType.BG_ADD_CSS_FILTER:
        case MessageType.BG_ADD_STATIC_THEME: {
            const {css, detectDarkTheme} = data;
            removeDynamicTheme();
            createOrUpdateStyle(css, type === MessageType.BG_ADD_STATIC_THEME ? 'static' : 'filter');
            if (detectDarkTheme) {
                runDarkThemeDetector((hasDarkTheme) => {
                    if (hasDarkTheme) {
                        removeStyle();
                        onDarkThemeDetected();
                    }
                });
            }
            break;
        }
        case MessageType.BG_ADD_SVG_FILTER: {
            const {css, svgMatrix, svgReverseMatrix, detectDarkTheme} = data;
            removeDynamicTheme();
            createOrUpdateSVGFilter(svgMatrix, svgReverseMatrix);
            createOrUpdateStyle(css, 'filter');
            if (detectDarkTheme) {
                runDarkThemeDetector((hasDarkTheme) => {
                    if (hasDarkTheme) {
                        removeStyle();
                        removeSVGFilter();
                        onDarkThemeDetected();
                    }
                });
            }
            break;
        }
        case MessageType.BG_ADD_DYNAMIC_THEME: {
            const {theme, fixes, isIFrame, detectDarkTheme} = data;
            removeStyle();
            createOrUpdateDynamicTheme(theme, fixes, isIFrame);
            if (detectDarkTheme) {
                runDarkThemeDetector((hasDarkTheme) => {
                    if (hasDarkTheme) {
                        removeDynamicTheme();
                        onDarkThemeDetected();
                    }
                });
            }
            break;
        }
        case MessageType.BG_EXPORT_CSS:
            collectCSS().then((collectedCSS) => sendMessage({type: MessageType.CS_EXPORT_CSS_RESPONSE, data: collectedCSS}));
            break;
        case MessageType.BG_UNSUPPORTED_SENDER:
        case MessageType.BG_CLEAN_UP:
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            stopDarkThemeDetector();
            break;
        case MessageType.BG_RELOAD:
            logWarn('Cleaning up before update');
            cleanup();
            break;
        default:
            break;
    }
}

chrome.runtime.onMessage.addListener(onMessage);
sendMessage({type: MessageType.CS_FRAME_CONNECT, data: {isDark: isSystemDarkScheme()}});

function onPageHide(e: PageTransitionEvent) {
    if (e.persisted === false) {
        sendMessage({type: MessageType.CS_FRAME_FORGET});
    }
}

function onFreeze() {
    sendMessage({type: MessageType.CS_FRAME_FREEZE});
}

function onResume() {
    sendMessage({type: MessageType.CS_FRAME_RESUME, data: {isDark: isSystemDarkScheme()}});
}

function onDarkThemeDetected() {
    sendMessage({type: MessageType.CS_DARK_THEME_DETECTED});
}

// Thunderbird don't has "tabs", and emails aren't 'frozen' or 'cached'.
// And will currently error: `Promise rejected after context unloaded: Actor 'Conduits' destroyed before query 'RuntimeMessage' was resolved`
if (!isThunderbird) {
    addEventListener('pagehide', onPageHide);
    addEventListener('freeze', onFreeze);
    addEventListener('resume', onResume);
}
