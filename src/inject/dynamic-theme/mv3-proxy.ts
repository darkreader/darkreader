import {injectProxy} from './stylesheet-proxy';

// TODO:
// 1. remember when proxy was injected and do nothing on the second run

document.currentScript.remove();

console.log('Running MV3 proxy...');

const key = 'darkreaderProxyInjected';

function dataReceiver(e: any) {
    document.removeEventListener('__darkreader__stylesheetProxy__response', dataReceiver);
    if (document.documentElement.dataset[key] !== undefined) {
        return;
    }
    document.documentElement.dataset[key] = 'true';
    console.log(`Executing MV3 injectProxy(${e.detail}) via reguler path.`);
    injectProxy(e.detail);
}

function inject() {
    // Note: we inject this script from multiple places at once for greater chance of winning the data race,
    // so we have to prevent repeated injections.
    if (document.documentElement.dataset[key] !== undefined) {
        return;
    }
    document.documentElement.dataset[key] = 'true';

    // If script was injected via a dedicated content script.
    const argString = document.currentScript.dataset.arg;
    if (argString !== undefined) {
        const arg: boolean = JSON.parse(argString);
        console.log(`Executing MV3 injectProxy(${arg}) via dedicated script.`);
        injectProxy(arg);
        return;
    }

    console.log('Setting up MV3 injectProxy via reguler path.');

    document.addEventListener('__darkreader__stylesheetProxy__response', dataReceiver);

    document.dispatchEvent(new CustomEvent('__darkreader__stylesheetProxy__request'));
}

inject();
