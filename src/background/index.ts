import {Extension} from './extension';
import {getHelpURL, UNINSTALL_URL} from '../utils/links';
import {canInjectScript} from '../background/utils/extension-api';
import type {ExtensionData, Message, UserSettings} from '../definitions';
import {MessageType} from '../utils/message';
import {makeChromiumHappy} from './make-chromium-happy';
import DevTools from './devtools';
import {logInfo} from './utils/log';
import {sendLog} from './utils/sendLog';

type TestMessage = {
    type: 'changeSettings';
    data: Partial<UserSettings>;
    id: number;
} | {
    type: 'collectData';
    id: number;
} | {
    type: 'changeLocalStorage';
    data: {[key: string]: string};
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
    type: 'getLocalStorage';
    id: number;
} | {
    type: 'setDataIsMigratedForTesting';
    data: boolean;
    id: number;
};

// Initialize extension
Extension.init();
Extension.start();

const welcome = `  /''''\\
 (0)==(0)
/__||||__\\
Welcome to Dark Reader!`;
console.log(welcome);

declare const __DEBUG__: boolean;
declare const __WATCH__: boolean;
declare const __LOG__: string | false;
declare const __PORT__: number;
declare const __TEST__: number;
declare const __MV3__: number;

if (__MV3__) {
    chrome.runtime.onInstalled.addListener(async () => {
        try {
            (chrome.scripting as any).unregisterContentScripts(() => {
                (chrome.scripting as any).registerContentScripts([{
                    id: 'proxy',
                    matches: [
                        '<all_urls>'
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
                    chrome.runtime.sendMessage<Message>({type: MessageType.BG_CSS_UPDATE});
                    break;
                case 'reload:ui':
                    chrome.runtime.sendMessage<Message>({type: MessageType.BG_UI_UPDATE});
                    break;
                case 'reload:full':
                    chrome.tabs.query({}, (tabs) => {
                        for (const tab of tabs) {
                            if (canInjectScript(tab.url)) {
                                chrome.tabs.sendMessage<Message>(tab.id, {type: MessageType.BG_RELOAD});
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
} else if (!__DEBUG__){
    chrome.runtime.onInstalled.addListener(({reason}) => {
        if (reason === 'install') {
            chrome.tabs.create({url: getHelpURL()});
        }
    });

    chrome.runtime.setUninstallURL(UNINSTALL_URL);
}

if (__TEST__) {
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onmessage = (e) => {
        const respond = (message: {type: string; data?: ExtensionData | string | boolean | {[key: string]: string}; id?: number}) => socket.send(JSON.stringify(message));
        try {
            const message: TestMessage = JSON.parse(e.data);
            switch (message.type) {
                case 'changeSettings':
                    Extension.changeSettings(message.data);
                    respond({type: 'changeSettings-response', id: message.id});
                    break;
                case 'collectData':
                    Extension.collectData().then((data) => {
                        respond({type: 'collectData-response', id: message.id, data});
                    });
                    break;
                case 'changeLocalStorage': {
                    const data = message.data;
                    for (const key in data) {
                        localStorage[key] = data[key];
                    }
                    respond({type: 'changeLocalStorage-response', id: message.id});
                    break;
                }
                case 'getLocalStorage':
                    respond({type: 'getLocalStorage-response', id: message.id, data: localStorage ? JSON.stringify(localStorage) : null});
                    break;
                case 'changeChromeStorage': {
                    const region = message.data.region;
                    chrome.storage[region].set(message.data.data, () => respond({type: 'changeChromeStorage-response', id: message.id}));
                    break;
                }
                case 'getChromeStorage': {
                    const keys = message.data.keys;
                    const region = message.data.region;
                    chrome.storage[region].get(keys, (data) => respond({type: 'getChromeStorage-response', data, id: message.id}));
                    break;
                }
                case 'setDataIsMigratedForTesting':
                    DevTools.setDataIsMigratedForTesting(message.data);
                    respond({type: 'setDataIsMigratedForTesting-response', id: message.id});
                    break;
            }
        } catch (err) {
            respond({type: 'error', data: String(err)});
        }
    };
}

if (__DEBUG__ && __LOG__) {
    chrome.runtime.onMessage.addListener((message: Message) => {
        if (message.type === 'cs-log') {
            sendLog(message.data.level, message.data.log);
        }
    });
}

makeChromiumHappy();
