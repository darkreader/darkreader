/**
 * Note: This content script is used only with MV3 to inject stylesheet proxy like so:
 * 1. This file (injector) is run in isolated content script context and it injects proxy
 *    into the real page context.
 * 2. The proxy prepares everything for stylesheet-proxy and executes it.
 */

import {logInfo} from '../../utils/log';

logInfo('MV3 proxy injector: dedicated injector started...');

/**
 * On the first run of event loop, document.head does not exist yet, so we have to wait for the second one.
 */
function injectScript() {
    if (document.head) {
        logInfo('MV3 proxy injector: dedicated injector attempts to inject...');
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject/proxy.js');
        document.head.prepend(script);
    } else {
        setTimeout(injectScript);
    }
}

injectScript();
