import {Extension} from './extension';
import {getHelpURL, UNINSTALL_URL} from '../utils/links';
import {canInjectScript} from '../background/utils/extension-api';
import type {ExtensionData, Message, UserSettings} from '../definitions';
import {MessageType} from '../utils/message';
import {makeChromiumHappy} from './make-chromium-happy';
import {logInfo} from '../utils/log';

// Initialize extension
const extension = new Extension();
extension.start();

const welcome = `  /''''\\
 (0)==(0)
/__||||__\\
Welcome to Dark Reader!`;
console.log(welcome);

declare const __DEBUG__: boolean;
declare const __WATCH__: boolean;
declare const __PORT__: number;
declare const __MV3__: number;
const WATCH = __WATCH__;

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

if (WATCH) {
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

if (__DEBUG__) {
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onmessage = (e) => {
        const respond = (message: {type: string; data?: ExtensionData | string | boolean | {[key: string]: string}; id?: number}) => socket.send(JSON.stringify(message));
        try {
            const message: {type: string; data: Partial<UserSettings> | boolean | {[key: string]: string}; id: number} = JSON.parse(e.data);
            switch (message.type) {
                case 'changeSettings':
                    extension.changeSettings(message.data as Partial<UserSettings>);
                    respond({type: 'changeSettings-response', id: message.id});
                    break;
                case 'collectData':
                    extension.collectData().then((data) => {
                        respond({type: 'collectData-response', id: message.id, data});
                    });
                    break;
                case 'changeLocalStorage': {
                    const data = message.data as {[key: string]: string};
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
                    const region: 'local' | 'sync' = (message.data as any).region;
                    chrome.storage[region].set((message.data as any).data, () => respond({type: 'changeChromeStorage-response', id: message.id}));
                    break;
                }
                case 'getChromeStorage': {
                    const keys = (message.data as any).keys;
                    const region: 'local' | 'sync' = (message.data as any).region;
                    chrome.storage[region].get(keys, (data) => respond({type: 'getChromeStorage-response', data, id: message.id}));
                    break;
                }
                case 'setDataIsMigratedForTesting':
                    extension.setDevToolsDataIsMigratedForTesting(message.data as boolean);
                    respond({type: 'setDataIsMigratedForTesting-response', id: message.id});
                    break;
            }
        } catch (err) {
            respond({type: 'error', data: String(err)});
        }
    };
}

makeChromiumHappy();
