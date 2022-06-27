import {injectProxy} from './stylesheet-proxy';

(function () {
    document.currentScript.remove();
    let args = undefined;
    const argsString = document.currentScript.getAttribute('args');
    if (argsString !== null) {
        args = JSON.parse(argsString);
    }
    injectProxy(args);
})();
