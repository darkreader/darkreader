import {injectProxy} from './stylesheet-proxy';

(function () {
    document.currentScript.remove();
    let args = undefined;
    const argsString = document.currentScript.dataset.args;
    if (argsString !== undefined) {
        args = JSON.parse(argsString);
    }
    injectProxy(args);
})();
