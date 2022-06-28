import {injectProxy} from './stylesheet-proxy';
import {logInfo} from '../../utils/log';

document.currentScript.remove();

const key = 'darkreaderProxyInjected';

function dataReceiver(e: any) {
    document.removeEventListener('__darkreader__stylesheetProxy__arg', dataReceiver);
    if (document.documentElement.dataset[key] !== undefined) {
        logInfo(`MV3 proxy injector: dedicated path exits because everything is done.`);
        return;
    }
    document.documentElement.dataset[key] = 'true';
    logInfo(`MV3 proxy injector: dedicated path runs injectProxy(${e.detail}).`);
    injectProxy(e.detail);
}

function regularPath() {
    if (document.documentElement.dataset[key] !== undefined) {
        return;
    }
    const argString = document.currentScript.dataset.arg;
    if (argString !== undefined) {
        document.documentElement.dataset[key] = 'true';
        const arg: boolean = JSON.parse(argString);
        logInfo(`MV3 proxy injector: regular path runs injectProxy(${arg}).`);
        injectProxy(arg);
    }
}

function dedicatedPath() {
    logInfo('MV3 proxy injector: dedicated path setup...');
    document.addEventListener('__darkreader__stylesheetProxy__arg', dataReceiver);
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
