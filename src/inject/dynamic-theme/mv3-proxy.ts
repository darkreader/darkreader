import {injectProxy} from './stylesheet-proxy';
import {logInfo} from '../../utils/log';

document.currentScript.remove();

const key = 'darkreaderProxyInjected';
const EVENT_DONE = '__darkreader__stylesheetProxy__done';
const EVENT_ARG = '__darkreader__stylesheetProxy__arg';

function injectProxyAndCleanup(arg: boolean) {
    injectProxy(arg);
    doneReceiver();
    document.dispatchEvent(new CustomEvent(EVENT_DONE));
}

function regularPath() {
    const argString = document.currentScript.dataset.arg;
    if (argString !== undefined) {
        document.documentElement.dataset[key] = 'true';
        const arg: boolean = JSON.parse(argString);
        logInfo(`MV3 proxy injector: regular path runs injectProxy(${arg}).`);
        injectProxyAndCleanup(arg);
    }
}

function dataReceiver(e: any) {
    document.removeEventListener(EVENT_ARG, dataReceiver);
    if (document.documentElement.dataset[key] !== undefined) {
        logInfo(`MV3 proxy injector: dedicated path exits because everything is done.`);
        return;
    }
    document.documentElement.dataset[key] = 'true';
    logInfo(`MV3 proxy injector: dedicated path runs injectProxy(${e.detail}).`);
    injectProxyAndCleanup(e.detail);
}

function doneReceiver() {
    document.removeEventListener(EVENT_ARG, dataReceiver);
    document.removeEventListener(EVENT_DONE, doneReceiver);
}

function dedicatedPath() {
    logInfo('MV3 proxy injector: dedicated path setup...');
    document.addEventListener(EVENT_ARG, dataReceiver);
    document.addEventListener(EVENT_DONE, doneReceiver);
}

function inject() {
    if (document.documentElement.dataset[key] !== undefined) {
        logInfo('MV3 proxy injector: proxy exits because everything is done.');
        return;
    }
    logInfo('MV3 proxy injector: proxy attempts to inject...');
    regularPath();
    dedicatedPath();
}

inject();
