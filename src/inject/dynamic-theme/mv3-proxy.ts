import {injectProxy} from './stylesheet-proxy';

document.currentScript.remove();
console.log('MV3 Proxy injected!');
// TODO: fix me!
injectProxy(false);
