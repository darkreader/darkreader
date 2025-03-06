import type {MessageBGtoCS, MessageCStoBG} from '../definitions';
import {isSystemDarkModeEnabled, runColorSchemeChangeDetector, stopColorSchemeChangeDetector} from '../utils/media-query';
import {MessageTypeCStoBG} from '../utils/message';
import {setDocumentVisibilityListener, documentIsVisible, removeDocumentVisibilityListener} from '../utils/visibility';

function cleanup() {
    stopColorSchemeChangeDetector();
    removeDocumentVisibilityListener();
}

function sendMessage(message: MessageCStoBG): void {
    const responseHandler = (response: MessageBGtoCS | 'unsupportedSender' | undefined) => {
        // Vivaldi bug workaround. See TabManager for details.
        if (response === 'unsupportedSender') {
            cleanup();
        }
    };

    try {
        const promise = chrome.runtime.sendMessage<MessageCStoBG, MessageBGtoCS | 'unsupportedSender'>(message);
        promise.then(responseHandler).catch(cleanup);
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

function notifyOfColorScheme(isDark: boolean): void {
    sendMessage({type: MessageTypeCStoBG.COLOR_SCHEME_CHANGE, data: {isDark}});
}

function updateEventListeners(): void {
    notifyOfColorScheme(isSystemDarkModeEnabled());
    if (documentIsVisible()) {
        runColorSchemeChangeDetector(notifyOfColorScheme);
    } else {
        stopColorSchemeChangeDetector();
    }
}

setDocumentVisibilityListener(updateEventListeners);
updateEventListeners();
