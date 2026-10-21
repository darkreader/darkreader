import {logInfo} from '../utils/log';

import {injectProxy} from './stylesheet-proxy';

document.currentScript && document.currentScript.remove();

const key = 'darkreaderProxyInjected';
const EVENT_ARG = '__darkreader__stylesheetProxy__arg';
const EVENT_CLEAN_UP = '__darkreader__cleanUp';

const registeredScriptPath = !document.currentScript;

function regularPath() {
    const argString = document.currentScript!.dataset.arg;
    if (argString !== undefined) {
        document.documentElement.dataset[key] = 'true';
        const args: {enableStyleSheetsProxy: boolean; enableCustomElementRegistryProxy: boolean} = JSON.parse(argString);
        logInfo(`MV3 proxy injector: regular path runs injectProxy(${argString}).`);
        injectProxy(args.enableStyleSheetsProxy, args.enableCustomElementRegistryProxy);
    }
}

function dataReceiver(e: any) {
    if (document.documentElement.dataset[key] !== undefined) {
        logInfo(`MV3 proxy injector: ${registeredScriptPath ? 'registered' : 'dedicated'} path exits because everything is done.`);
        return;
    }
    document.documentElement.dataset[key] = 'true';
    logInfo(`MV3 proxy injector: ${registeredScriptPath ? 'registered' : 'dedicated'} path runs injectProxy(${e.detail}).`);
    injectProxy(e.detail.enableStyleSheetsProxy, e.detail.enableCustomElementRegistryProxy);
}

function cleanUpReceiver() {
    delete document.documentElement.dataset[key];
}

function dedicatedPath() {
    logInfo(`MV3 proxy injector: ${registeredScriptPath ? 'registered' : 'dedicated'} path setup...`);
    document.addEventListener(EVENT_ARG, dataReceiver);
    document.addEventListener(EVENT_CLEAN_UP, cleanUpReceiver);
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
