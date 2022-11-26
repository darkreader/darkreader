import {isSystemDarkModeEnabled, runColorSchemeChangeDetector, stopColorSchemeChangeDetector} from '../utils/media-query';
import type {Message} from '../definitions';
import {MessageType} from '../utils/message';
import {setDocumentVisibilityListener, documentIsVisible, removeDocumentVisibilityListener} from '../utils/visibility';

function cleanup() {
    stopColorSchemeChangeDetector();
    removeDocumentVisibilityListener();
}

function sendMessage(message: Message) {
    const responseHandler = (response: Message | 'unsupportedSender' | undefined) => {
        // Vivaldi bug workaround. See TabManager for details.
        if (response === 'unsupportedSender') {
            cleanup();
        }
    };

    try {
        const promise: Promise<Message | 'unsupportedSender'> = chrome.runtime.sendMessage<Message>(message);
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
            console.log('Dark Reader: instance of old CS detected, clening up.');
            cleanup();
        } else {
            console.log('Dark Reader: unexpected error during message passing.');
        }
    }
}

function notifyOfColorScheme(isDark: boolean) {
    sendMessage({type: MessageType.CS_COLOR_SCHEME_CHANGE, data: {isDark}});
}

function updateEventListeners() {
    notifyOfColorScheme(isSystemDarkModeEnabled());
    if (documentIsVisible()) {
        runColorSchemeChangeDetector(notifyOfColorScheme);
    } else {
        stopColorSchemeChangeDetector();
    }
}

setDocumentVisibilityListener(updateEventListeners);
updateEventListeners();
