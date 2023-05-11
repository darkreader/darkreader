import {createOrUpdateStyle, removeStyle} from './style';
import {createOrUpdateSVGFilter, removeSVGFilter} from './svg-filter';
import {runDarkThemeDetector, stopDarkThemeDetector} from './detector';
import {createOrUpdateDynamicTheme, removeDynamicTheme, cleanDynamicThemeCache} from './dynamic-theme';
import {logWarn, logInfoCollapsed} from './utils/log';
import {isSystemDarkModeEnabled, runColorSchemeChangeDetector, stopColorSchemeChangeDetector, emulateColorScheme} from '../utils/media-query';
import {collectCSS} from './dynamic-theme/css-collection';
import type {DynamicThemeFix, Message, Theme} from '../definitions';
import {MessageType} from '../utils/message';

declare const __TEST__: boolean;

let unloaded = false;

let darkReaderDynamicThemeStateForTesting: 'loading' | 'ready' = 'loading';

declare const __CHROMIUM_MV3__: boolean;
declare const __THUNDERBIRD__: boolean;
declare const __FIREFOX_MV2__: boolean;

function cleanup() {
    unloaded = true;
    removeEventListener('pagehide', onPageHide);
    removeEventListener('freeze', onFreeze);
    removeEventListener('resume', onResume);
    cleanDynamicThemeCache();
    stopDarkThemeDetector();
    stopColorSchemeChangeDetector();
}

function sendMessageForTesting(uuid: string) {
    document.dispatchEvent(new CustomEvent('test-message', {detail: uuid}));
}

function sendMessage(message: Message) {
    if (unloaded) {
        return;
    }
    const responseHandler = (response: Message | 'unsupportedSender' | undefined) => {
        // Vivaldi bug workaround. See TabManager for details.
        if (response === 'unsupportedSender') {
            removeStyle();
            removeSVGFilter();
            removeDynamicTheme();
            cleanup();
        }
    };

    try {
        if (__CHROMIUM_MV3__) {
            const promise = chrome.runtime.sendMessage<Message, Message | 'unsupportedSender'>(message);
            promise.then(responseHandler).catch(cleanup);
        } else {
            chrome.runtime.sendMessage<Message, 'unsupportedSender' | undefined>(message, responseHandler);
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
            console.log('Dark Reader: instance of old CS detected, clening up.');
            cleanup();
        } else {
            console.log('Dark Reader: unexpected error during message passing.');
        }
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
            const {theme, fixes, isIFrame, detectDarkTheme} = data as {theme: Theme; fixes: DynamicThemeFix[]; isIFrame: boolean; detectDarkTheme: boolean};
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
            if (__TEST__) {
                darkReaderDynamicThemeStateForTesting = 'ready';
                sendMessageForTesting('darkreader-dynamic-theme-ready');
                sendMessageForTesting(`darkreader-dynamic-theme-ready-${document.location.pathname}`);
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

runColorSchemeChangeDetector((isDark) =>
    sendMessage({type: MessageType.CS_COLOR_SCHEME_CHANGE, data: {isDark}})
);

chrome.runtime.onMessage.addListener(onMessage);
sendMessage({type: MessageType.CS_FRAME_CONNECT, data: {isDark: isSystemDarkModeEnabled()}});

function onPageHide(e: PageTransitionEvent) {
    if (e.persisted === false) {
        sendMessage({type: MessageType.CS_FRAME_FORGET});
    }
}

function onFreeze() {
    sendMessage({type: MessageType.CS_FRAME_FREEZE});
}

function onResume() {
    sendMessage({type: MessageType.CS_FRAME_RESUME, data: {isDark: isSystemDarkModeEnabled()}});
}

function onDarkThemeDetected() {
    sendMessage({type: MessageType.CS_DARK_THEME_DETECTED});
}

// Thunderbird does not have "tabs", and emails aren't 'frozen' or 'cached'.
// And will currently error: `Promise rejected after context unloaded: Actor 'Conduits' destroyed before query 'RuntimeMessage' was resolved`
if (!__THUNDERBIRD__) {
    addEventListener('pagehide', onPageHide, {passive: true});
    addEventListener('freeze', onFreeze, {passive: true});
    addEventListener('resume', onResume, {passive: true});
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
        // Note that here we wait only for DOM parsing and not for subresource load
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

    // TODO(anton): remove this once Firefox supports tab.eval() via WebDriver BiDi
    if (__FIREFOX_MV2__) {
        function expectPageStyles(data: any) {
            const checkOne = (expectation: any) => {
                const [selector, cssAttributeName, expectedValue] = expectation;
                const selector_ = Array.isArray(selector) ? selector : [selector];
                let element = document as any;
                for (const part of selector_) {
                    if (element instanceof HTMLIFrameElement) {
                        element = element.contentDocument;
                    }
                    if (element.shadowRoot instanceof ShadowRoot) {
                        element = element.shadowRoot;
                    }
                    if (part === 'document') {
                        element = element.documentElement;
                    } else {
                        element = element.querySelector(part);
                    }
                    if (!element) {
                        return `Could not find element ${part}`;
                    }
                }
                const style = getComputedStyle(element);
                if (style[cssAttributeName] !== expectedValue) {
                    return `Got ${style[cssAttributeName]}`;
                }
            };

            const errors: Array<[number, string]> = [];
            const expectations = Array.isArray(data[0]) ? data : [data];
            for (let i = 0; i < expectations.length; i++) {
                const error = checkOne(expectations[i]);
                if (error) {
                    errors.push([i, error]);
                }
            }
            return errors;
        }

        socket.onmessage = (e) => {
            function respond(data: any) {
                socket.send(JSON.stringify({id, data}));
            }

            const {id, data, type} = JSON.parse(e.data);
            switch (type) {
                case 'firefox-eval': {
                    const result = eval(data);
                    if (result instanceof Promise) {
                        result.then(respond);
                    } else {
                        respond(result);
                    }
                    break;
                }
                case 'firefox-expectPageStyles': {
                    // Styles may not have been applied to the document yet,
                    // so we check once immediatelly and then on an interval.
                    function checkPageStylesNow() {
                        const errors = expectPageStyles(data);
                        if (errors.length === 0) {
                            respond([]);
                            interval && clearInterval(interval);
                        }
                    }

                    const interval: number = setInterval(checkPageStylesNow, 200);
                    checkPageStylesNow();
                    break;
                }
                case 'firefox-getColorScheme': {
                    respond(isSystemDarkModeEnabled() ? 'dark' : 'light');
                    break;
                }
                case 'firefox-emulateColorScheme': {
                    emulateColorScheme(data);
                    respond(undefined);
                    break;
                }
            }
        };
    }
}
