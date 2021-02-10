export const contentScriptPort = chrome.runtime.connect({name: 'tab'});
export const disconnectContentScript = () => contentScriptPort.disconnect();
