/**
 * Note: This content script is used only with MV3 to inject stylesheet proxy like so:
 * 1. This file (injector) is run in isolated content script context and it injects proxy
 *    into the real page context.
 * 2. The proxy prepares everything for stylesheet-proxy and executes it.
 */

let complete = false;

/**
 * On the first run of event loop, document.head does not exist yet, so we have to wait for the second one.
 */
function injectScript() {
    if (complete) {
        return;
    }
    if (document.head) {
        complete = true;
        const proxyScript = document.createElement('script');
        proxyScript.src = chrome.runtime.getURL('inject/proxy.js');
        document.head.appendChild(proxyScript);
    } else {
        setTimeout(injectScript);
    }
}

injectScript();
