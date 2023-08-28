import {Extension} from './extension';
import {getHelpURL, UNINSTALL_URL} from '../utils/links';
import {canInjectScript} from '../background/utils/extension-api';
import type {ColorScheme, DebugMessageBGtoCS, DebugMessageBGtoUI, DebugMessageCStoBG, ExtensionData, News, UserSettings} from '../definitions';
import {DebugMessageTypeBGtoCS, DebugMessageTypeBGtoUI, DebugMessageTypeCStoBG} from '../utils/message';
import {makeChromiumHappy} from './make-chromium-happy';
import {ASSERT, logInfo} from './utils/log';
import {sendLog} from './utils/sendLog';
import {isFirefox} from '../utils/platform';
import {emulateColorScheme, isSystemDarkModeEnabled} from '../utils/media-query';
import {setNewsForTesting} from './newsmaker';

type TestMessage = {
    type: 'getManifest';
    id: number;
} | {
    type: 'changeSettings';
    data: Partial<UserSettings>;
    id: number;
} | {
    type: 'collectData';
    id: number;
} | {
    type: 'getChromeStorage';
    data: {
        region: 'local' | 'sync';
        keys: string | string[];
    };
    id: number;
} | {
    type: 'changeChromeStorage';
    data: {
        region: 'local' | 'sync';
        data: {[key: string]: any};
    };
    id: number;
} | {
    type: 'firefox-createTab';
    data: string;
    id: number;
} | {
    type: 'firefox-getColorScheme';
    id: number;
} | {
    type: 'firefox-emulateColorScheme';
    data: ColorScheme;
    id: number;
} | {
    type: 'setNews';
    data: News[];
    id: number;
};

// Start extension
const extension = Extension.start();

const welcome = `  /''''\\
 (0)==(0)
/__||||__\\
Welcome to Dark Reader!`;
console.log(welcome);

declare const __DEBUG__: boolean;
declare const __WATCH__: boolean;
declare const __LOG__: string | false;
declare const __PORT__: number;
declare const __TEST__: boolean;
declare const __CHROMIUM_MV3__: boolean;
declare const __FIREFOX_MV2__: boolean;

if (__CHROMIUM_MV3__) {
    chrome.runtime.onInstalled.addListener(async () => {
        try {
            chrome.scripting.unregisterContentScripts(() => {
                chrome.scripting.registerContentScripts([{
                    id: 'proxy',
                    matches: [
                        '<all_urls>',
                    ],
                    js: [
                        'inject/proxy.js',
                    ],
                    runAt: 'document_start',
                    allFrames: true,
                    persistAcrossSessions: true,
                    world: 'MAIN',
                }], () => logInfo('Registerd direct CSS proxy injector.'));
            });
        } catch (e) {
            logInfo('Failed to register direct CSS proxy injector, falling back to other injection methods.');
        }
    });
}

if (__WATCH__) {
    const PORT = __PORT__;
    const ALARM_NAME = 'socket-close';
    const PING_INTERVAL_IN_MINUTES = 1 / 60;

    const socketAlarmListener = (alarm: chrome.alarms.Alarm) => {
        if (alarm.name === ALARM_NAME) {
            listen();
        }
    };

    const listen = () => {
        const socket = new WebSocket(`ws://localhost:${PORT}`);
        const send = (message: {type: string}) => socket.send(JSON.stringify(message));
        socket.onmessage = (e) => {
            chrome.alarms.onAlarm.removeListener(socketAlarmListener);

            const message = JSON.parse(e.data);
            if (message.type.startsWith('reload:')) {
                send({type: 'reloading'});
            }
            switch (message.type) {
                case 'reload:css':
                    chrome.runtime.sendMessage<DebugMessageBGtoUI>({type: DebugMessageTypeBGtoUI.CSS_UPDATE});
                    break;
                case 'reload:ui':
                    chrome.runtime.sendMessage<DebugMessageBGtoUI>({type: DebugMessageTypeBGtoUI.UPDATE});
                    break;
                case 'reload:full':
                    chrome.tabs.query({}, (tabs) => {
                        const message: DebugMessageBGtoCS = {type: DebugMessageTypeBGtoCS.RELOAD};
                        // Some contexts are not considered to be tabs and can not receive regular messages
                        chrome.runtime.sendMessage<DebugMessageBGtoCS>(message);
                        for (const tab of tabs) {
                            if (canInjectScript(tab.url)) {
                                if (__CHROMIUM_MV3__) {
                                    chrome.tabs.sendMessage<DebugMessageBGtoCS>(tab.id!, message).catch(() => { /* noop */ });
                                    continue;
                                }
                                chrome.tabs.sendMessage<DebugMessageBGtoCS>(tab.id!, message);
                            }
                        }
                        chrome.runtime.reload();
                    });
                    break;
            }
        };
        socket.onclose = () => {
            chrome.alarms.onAlarm.addListener(socketAlarmListener);
            chrome.alarms.create(ALARM_NAME, {delayInMinutes: PING_INTERVAL_IN_MINUTES});
        };
    };

    listen();
} else if (!__DEBUG__ && !__TEST__) {
    chrome.runtime.onInstalled.addListener(({reason}) => {
        if (reason === 'install') {
            chrome.tabs.create({url: getHelpURL()});
        }
    });

    chrome.runtime.setUninstallURL(UNINSTALL_URL);
}

if (__TEST__) {
    // Open popup and DevTools pages
    chrome.tabs.create({url: chrome.runtime.getURL('/ui/popup/index.html'), active: false});
    chrome.tabs.create({url: chrome.runtime.getURL('/ui/devtools/index.html'), active: false});

    let testTabId: number | null = null;
    if (__FIREFOX_MV2__) {
        chrome.tabs.create({url: 'about:blank', active: true}, ({id}) => testTabId = id!);
    }

    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onopen = async () => {
        // Wait for extension to start
        await extension;
        socket.send(JSON.stringify({
            data: {
                type: 'background',
                extensionOrigin: chrome.runtime.getURL(''),
            },
            id: null,
        }));
    };
    socket.onmessage = (e) => {
        try {
            const message: TestMessage = JSON.parse(e.data);
            const {id, type} = message;
            const respond = (data?: ExtensionData | string | boolean | {[key: string]: string} | null) => socket.send(JSON.stringify({
                data,
                id,
            }));

            switch (type) {
                case 'changeSettings':
                    Extension.changeSettings(message.data);
                    respond();
                    break;
                case 'collectData':
                    Extension.collectData().then(respond);
                    break;
                case 'getManifest': {
                    const data = chrome.runtime.getManifest();
                    respond(data);
                    break;
                }
                case 'changeChromeStorage': {
                    const region = message.data.region;
                    chrome.storage[region].set(message.data.data, () => respond());
                    break;
                }
                case 'getChromeStorage': {
                    const keys = message.data.keys;
                    const region = message.data.region;
                    chrome.storage[region].get(keys, respond);
                    break;
                }
                case 'setNews':
                    setNewsForTesting(message.data);
                    respond();
                    break;
                // TODO(anton): remove this once Firefox supports tab.eval() via WebDriver BiDi
                case 'firefox-createTab':
                    ASSERT('Firefox-specific function', isFirefox);
                    chrome.tabs.update(testTabId!, {url: message.data, active: true}, () => respond());
                    break;
                case 'firefox-getColorScheme': {
                    ASSERT('Firefox-specific function', isFirefox);
                    respond(isSystemDarkModeEnabled() ? 'dark' : 'light');
                    break;
                }
                case 'firefox-emulateColorScheme': {
                    ASSERT('Firefox-specific function', isFirefox);
                    emulateColorScheme(message.data);
                    respond();
                    break;
                }
            }
        } catch (err) {
            socket.send(JSON.stringify({error: String(err), original: e.data}));
        }
    };

    chrome.downloads.onCreated.addListener(({id, mime, url, danger, paused}) => {
        // Cancel download
        chrome.downloads.cancel(id);

        try {
            const {protocol, origin} = new URL(url);
            const realOrigin = (new URL(chrome.runtime.getURL(''))).origin;
            const ok = paused === false && danger === 'safe' && protocol === 'blob:' && origin === realOrigin;
            socket.send(JSON.stringify({
                data: {
                    type: 'download',
                    ok,
                    mime,
                },
                id: null,
            }));
        } catch (e) {
            // Do nothing
        }
    });
}

if (__DEBUG__ && __LOG__) {
    chrome.runtime.onMessage.addListener((message: DebugMessageCStoBG) => {
        if (message.type === DebugMessageTypeCStoBG.LOG) {
            sendLog(message.data.level, message.data.log);
        }
    });
}

makeChromiumHappy();
