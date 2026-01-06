import type {DebugMessageBGtoCS, MessageBGtoCS, MessageCStoBG, MessageCStoUI, MessageUItoCS} from '../definitions';
import {isSystemDarkModeEnabled, runColorSchemeChangeDetector, stopColorSchemeChangeDetector} from '../utils/media-query';
import {DebugMessageTypeBGtoCS, MessageTypeBGtoCS, MessageTypeCStoBG, MessageTypeCStoUI, MessageTypeUItoCS} from '../utils/message';
import {generateUID} from '../utils/uid';
import {HOMEPAGE_URL} from '../utils/links';
import {activateTheme} from '@plus/utils/theme';

import {writeEnabledForHost} from './cache';
import {runDarkThemeDetector, stopDarkThemeDetector} from './detector';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {collectCSS} from './dynamic-theme/css-collection';
import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {logWarn, logInfoCollapsed} from './utils/log';
import {createFloatingToggle, updateFloatingToggle, removeFloatingToggle} from './floating-toggle';

declare const __DEBUG__: boolean;
declare const __PLUS__: boolean;
declare const __TEST__: boolean;

let unloaded = false;
let currentlyEnabled = true;

let darkReaderDynamicThemeStateForTesting: 'loading' | 'ready' = 'loading';

declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;

// Identifier for this particular script instance. It is used as an alternative to chrome.runtime.MessageSender.documentId
const scriptId = generateUID();

function cleanup() {
    unloaded = true;
    removeEventListener('pagehide', onPageHide);
    removeEventListener('freeze', onFreeze);
    removeEventListener('resume', onResume);
    cleanDynamicThemeCache();
    stopDarkThemeDetector();
    stopColorSchemeChangeDetector();
    removeFloatingToggle();
}

function toggleDarkMode() {
    // Send message to background to toggle
    sendMessage({type: MessageTypeCStoBG.TOGGLE_ENABLED});
}

function sendMessageForTesting(uuid: string) {
    document.dispatchEvent(new CustomEvent('test-message', {detail: uuid}));
}

function sendMessage(message: MessageCStoBG | MessageCStoUI): true | undefined {
    if (unloaded) {
        return;
    }
    const responseHandler = (response: MessageBGtoCS | 'unsupportedSender' | undefined) => {
        // Vivaldi bug workaround. See TabManager for details.
        if (response === 'unsupportedSender' || response?.type === MessageTypeBGtoCS.UNSUPPORTED_SENDER) {
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            cleanup();
        }
    };

    try {
        if (__CHROMIUM_MV3__) {
            const promise = chrome.runtime.sendMessage<MessageCStoBG | MessageCStoUI, MessageBGtoCS | 'unsupportedSender'>(message);
            promise.then(responseHandler).catch(cleanup);
        } else {
            chrome.runtime.sendMessage<MessageCStoBG | MessageCStoUI, 'unsupportedSender' | undefined>(message, responseHandler);
        }
    } catch (error) {
        /*
         * We get here if Background context is unreachable which occurs when:
         *  - extension was disabled
         *  - extension was uninstalled
         *  - extension was updated and this is the old instance of content script
         *
         * Any async operations can be ignored here, but sync ones should run to completion.
         *
         * Regular message passing errors are returned via rejected promise or runtime.lastError.
         */
        if (error.message === 'Extension context invalidated.') {
            console.log('Dark Reader: instance of old CS detected, cleaning up.');
            cleanup();
        } else {
            console.log('Dark Reader: unexpected error during message passing.');
        }
    }
}

function onMessage(message: MessageBGtoCS | MessageUItoCS | DebugMessageBGtoCS) {
    if (__DEBUG__ && message.type === DebugMessageTypeBGtoCS.RELOAD) {
        logWarn('Cleaning up before update');
        cleanup();
        return;
    }

    if ((message as MessageBGtoCS).scriptId !== scriptId && message.type !== MessageTypeUItoCS.EXPORT_CSS) {
        return;
    }

    logInfoCollapsed(`onMessage[${message.type}]`, message);
    switch (message.type) {
        case MessageTypeBGtoCS.ADD_CSS_FILTER:
        case MessageTypeBGtoCS.ADD_STATIC_THEME: {
            const {css, detectDarkTheme, detectorHints} = message.data;
            removeDynamicTheme();
            createOrUpdateStyle(css, message.type === MessageTypeBGtoCS.ADD_STATIC_THEME ? 'static' : 'filter');
            writeEnabledForHost(true);
            currentlyEnabled = true;
            createFloatingToggle(currentlyEnabled, toggleDarkMode);
            if (detectDarkTheme) {
                runDarkThemeDetector((hasDarkTheme) => {
                    if (hasDarkTheme) {
                        removeStyle();
                        onDarkThemeDetected();
                    }
                }, detectorHints);
            }
            break;
        }
        case MessageTypeBGtoCS.ADD_SVG_FILTER: {
            const {css, svgMatrix, svgReverseMatrix, detectDarkTheme, detectorHints} = message.data;
            removeDynamicTheme();
            createOrUpdateSVGFilter(svgMatrix, svgReverseMatrix);
            createOrUpdateStyle(css, 'filter');
            writeEnabledForHost(true);
            currentlyEnabled = true;
            createFloatingToggle(currentlyEnabled, toggleDarkMode);
            if (detectDarkTheme) {
                runDarkThemeDetector((hasDarkTheme) => {
                    if (hasDarkTheme) {
                        removeStyle();
                        removeSVGFilter();
                        onDarkThemeDetected();
                    }
                }, detectorHints);
            }
            break;
        }
        case MessageTypeBGtoCS.ADD_DYNAMIC_THEME: {
            const {theme, fixes, isIFrame, detectDarkTheme, detectorHints} = message.data;
            removeStyle();
            createOrUpdateDynamicTheme(theme, fixes, isIFrame);
            writeEnabledForHost(true);
            currentlyEnabled = true;
            createFloatingToggle(currentlyEnabled, toggleDarkMode);
            if (detectDarkTheme) {
                runDarkThemeDetector((hasDarkTheme) => {
                    if (hasDarkTheme) {
                        removeDynamicTheme();
                        onDarkThemeDetected();
                    }
                }, detectorHints);
            }
            if (__TEST__) {
                darkReaderDynamicThemeStateForTesting = 'ready';
                sendMessageForTesting('darkreader-dynamic-theme-ready');
                sendMessageForTesting(`darkreader-dynamic-theme-ready-${document.location.pathname}`);
            }
            break;
        }
        case MessageTypeUItoCS.EXPORT_CSS:
            collectCSS().then((collectedCSS) => sendMessage({type: MessageTypeCStoUI.EXPORT_CSS_RESPONSE, data: collectedCSS}));
            break;
        case MessageTypeBGtoCS.UNSUPPORTED_SENDER:
        case MessageTypeBGtoCS.CLEAN_UP:
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            stopDarkThemeDetector();
            writeEnabledForHost(false);
            currentlyEnabled = false;
            updateFloatingToggle(false);
            break;
        default:
            break;
    }
}

function sendConnectionOrResumeMessage(type: MessageTypeCStoBG.DOCUMENT_CONNECT | MessageTypeCStoBG.DOCUMENT_RESUME) {
    sendMessage(
        {
            type,
            scriptId,
            data: (__CHROMIUM_MV2__ || __CHROMIUM_MV3__) ? {
                isDark: isSystemDarkModeEnabled(),
                isTopFrame: window === window.top,
            } : {
                isDark: isSystemDarkModeEnabled(),
            },
        });
}

runColorSchemeChangeDetector((isDark) =>
    sendMessage({type: MessageTypeCStoBG.COLOR_SCHEME_CHANGE, data: {isDark}})
);

chrome.runtime.onMessage.addListener(onMessage);
sendConnectionOrResumeMessage(MessageTypeCStoBG.DOCUMENT_CONNECT);

function onPageHide(e: PageTransitionEvent) {
    if (e.persisted === false) {
        sendMessage({type: MessageTypeCStoBG.DOCUMENT_FORGET, scriptId});
    }
}

function onFreeze() {
    sendMessage({type: MessageTypeCStoBG.DOCUMENT_FREEZE});
}

function onResume() {
    sendConnectionOrResumeMessage(MessageTypeCStoBG.DOCUMENT_RESUME);
}

function onDarkThemeDetected() {
    writeEnabledForHost(false);
    sendMessage({type: MessageTypeCStoBG.DARK_THEME_DETECTED});
}

addEventListener('pagehide', onPageHide, {passive: true});
addEventListener('freeze', onFreeze, {passive: true});
addEventListener('resume', onResume, {passive: true});

if (__PLUS__) {
    if (location.origin === HOMEPAGE_URL) {
        document.addEventListener('__darkreader_activate__', async (e: CustomEvent) => {
            const {email, key} = e.detail;
            const result = await activateTheme(email, key);
            document.dispatchEvent(new CustomEvent('__darkreader_activationResult__', {detail: {result}}));
        }, {once: true});
    }
}

if (__TEST__) {
    async function awaitDOMContentLoaded() {
        if (document.readyState === 'loading') {
            return new Promise<void>((resolve) => {
                addEventListener('DOMContentLoaded', () => resolve(), {passive: true});
            });
        }
    }

    async function awaitDarkReaderReady() {
        if (darkReaderDynamicThemeStateForTesting !== 'ready') {
            return new Promise<void>((resolve) => {
                document.addEventListener('test-message', (event: CustomEvent) => {
                    const message = event.detail;
                    if (message === 'darkreader-dynamic-theme-ready' && darkReaderDynamicThemeStateForTesting === 'ready') {
                        resolve();
                    }
                }, {passive: true});
            });
        }
    }

    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onopen = async () => {
        document.addEventListener('test-message', (e: CustomEvent) => {
            socket.send(JSON.stringify({
                data: {
                    type: 'page',
                    uuid: e.detail,
                },
                id: null,
            }));
        }, {passive: true});

        // Wait for DOM to be complete
        // Note that here we wait only for DOM parsing and not for sub-resource load
        await awaitDOMContentLoaded();
        await awaitDarkReaderReady();
        socket.send(JSON.stringify({
            data: {
                type: 'page',
                message: 'page-ready',
                uuid: `ready-${document.location.pathname}`,
            },
            id: null,
        }));
    };
}
