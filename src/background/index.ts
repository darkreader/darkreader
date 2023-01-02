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
    type: 'getManifest';
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

if (__CHROMIUM_MV3__) {
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
                                chrome.tabs.sendMessage<Message>(tab.id!, {type: MessageType.BG_RELOAD});
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
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onopen = async () => {
        // Wait for extension to start
        await extension;
        socket.send(JSON.stringify({
            data: {
                extensionOrigin: chrome.runtime.getURL(''),
            },
            id: null,
        }));
    };
    socket.onmessage = (e) => {
        try {
            const message: TestMessage = JSON.parse(e.data);
            const respond = (data?: ExtensionData | string | boolean | {[key: string]: string} | null) => socket.send(JSON.stringify({
                data,
                id: message.id,
            }));

            switch (message.type) {
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
            }
        } catch (err) {
            socket.send(JSON.stringify({error: String(err), original: e.data}));
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
