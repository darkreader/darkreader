import {logInfo} from '../utils/log';

import {injectProxy} from './stylesheet-proxy';

document.currentScript && document.currentScript.remove();

const key = 'darkreaderProxyInjected';
const EVENT_DONE = '__darkreader__stylesheetProxy__done';
const EVENT_ARG = '__darkreader__stylesheetProxy__arg';

const registeredScriptPath = !document.currentScript;

function injectProxyAndCleanup(args: {enableStyleSheetsProxy: boolean; enableCustomElementRegistryProxy: boolean}) {
    injectProxy(args.enableStyleSheetsProxy, args.enableCustomElementRegistryProxy);
    doneReceiver();
    document.dispatchEvent(new CustomEvent(EVENT_DONE));
}

function regularPath() {
    const argString = document.currentScript!.dataset.arg;
    if (argString !== undefined) {
        document.documentElement.dataset[key] = 'true';
        const args: {enableStyleSheetsProxy: boolean; enableCustomElementRegistryProxy: boolean} = JSON.parse(argString);
        logInfo(`MV3 proxy injector: regular path runs injectProxy(${argString}).`);
        injectProxyAndCleanup(args);
    }
}

function dataReceiver(e: any) {
    document.removeEventListener(EVENT_ARG, dataReceiver);
    if (document.documentElement.dataset[key] !== undefined) {
        logInfo(`MV3 proxy injector: ${registeredScriptPath ? 'registered' : 'dedicated'} path exits because everything is done.`);
        return;
    }
    document.documentElement.dataset[key] = 'true';
    logInfo(`MV3 proxy injector: ${registeredScriptPath ? 'registered' : 'dedicated'} path runs injectProxy(${e.detail}).`);
    injectProxyAndCleanup(e.detail);
}

function doneReceiver() {
    document.removeEventListener(EVENT_ARG, dataReceiver);
    document.removeEventListener(EVENT_DONE, doneReceiver);
}

function dedicatedPath() {
    logInfo(`MV3 proxy injector: ${registeredScriptPath ? 'registered' : 'dedicated'} path setup...`);
    // TODO: use EventListenerOptions class once it is updated
    // Note: make sure capture is not set
    const listenerOptions: any = {
        passive: true,
        once: true,
    };
    document.addEventListener(EVENT_ARG, dataReceiver, listenerOptions);
    document.addEventListener(EVENT_DONE, doneReceiver, listenerOptions);
}

function inject() {
    if (document.documentElement.dataset[key] !== undefined) {
        logInfo('MV3 proxy injector: proxy exits because everything is done.');
        return;
    }
    logInfo('MV3 proxy injector: proxy attempts to inject...');
    document.currentScript && regularPath();
    dedicatedPath();
}

inject();
