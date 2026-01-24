import {m} from 'malevic';
import {sync} from 'malevic/dom';

import type {ExtensionData, ExtensionActions, DebugMessageBGtoCS, DebugMessageBGtoUI} from '../../definitions';
import {DebugMessageTypeBGtoUI} from '../../utils/message';
import {isMobile, isFirefox} from '../../utils/platform';
import Connector from '../connect/connector';
import {getFontList, saveFile} from '../utils';

import Body from './components/body';
import {fixNotClosingPopupOnNavigation} from './utils/issues';
import {initAltUI, shouldUseAltUI} from '@plus/popup/plus-body';

declare const __PLUS__: boolean;

function renderBody(data: ExtensionData, fonts: string[], installation: {date: number; version: string}, actions: ExtensionActions) {
    if (data.settings.previewNewDesign) {
        if (!document.documentElement.classList.contains('preview')) {
            document.documentElement.classList.add('preview');
        }
    } else if (document.documentElement.classList.contains('preview')) {
        document.documentElement.classList.remove('preview');
    }

    if (data.news && data.news.length > 0) {
        const latest = data.news[0];
        if (latest && !latest.displayed) {
            actions.markNewsAsDisplayed([latest.id]);
        }
    }

    sync(document.body, (
        <Body data={data} actions={actions} fonts={fonts} installation={installation} />
    ));
}

async function getInstallationData() {
    return new Promise<any>((resolve) => {
        chrome.storage.local.get<Record<string, any>>({installation: {}}, (data) => {
            if (data?.installation?.version) {
                resolve(data.installation);
            } else {
                resolve({});
            }
        });
    });
}

async function start() {
    if (__PLUS__ && shouldUseAltUI()) {
        return await initAltUI();
    }

    const connector = new Connector();
    window.addEventListener('unload', () => connector.disconnect());

    const [data, fonts, installation] = await Promise.all([
        connector.getData(),
        getFontList(),
        getInstallationData(),
    ]);
    renderBody(data, fonts, installation, connector);
    connector.subscribeToChanges((data) => renderBody(data, fonts, installation, connector));
}

window.addEventListener('load', start);

document.documentElement.classList.toggle('mobile', isMobile);
document.documentElement.classList.toggle('firefox', isFirefox);

if (isFirefox) {
    fixNotClosingPopupOnNavigation();
}

declare const __DEBUG__: boolean;
if (__DEBUG__) {
    chrome.runtime.onMessage.addListener(({type}: DebugMessageBGtoCS | DebugMessageBGtoUI) => {
        if (type === DebugMessageTypeBGtoUI.CSS_UPDATE) {
            document.querySelectorAll('link[rel="stylesheet"]').forEach((link: HTMLLinkElement) => {
                const url = link.href;
                link.disabled = true;
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = url.replace(/\?.*$/, `?nocache=${Date.now()}`);
                link.parentElement!.insertBefore(newLink, link);
                link.remove();
            });
        }

        if (type === DebugMessageTypeBGtoUI.UPDATE) {
            location.reload();
        }
    });
}

declare const __TEST__: boolean;
if (__TEST__) {
    const socket = new WebSocket(`ws://localhost:8894`);
    socket.onopen = async () => {
        socket.send(JSON.stringify({
            data: {
                type: 'popup',
                uuid: `ready-${document.location.pathname}`,
            },
            id: null,
        }));
    };
    socket.onmessage = (e) => {
        const respond = (message: {id?: number; data?: any; error?: string}) => socket.send(JSON.stringify(message));
        try {
            const message: {type: string; id: number; data: any} = JSON.parse(e.data);
            const {type, id, data} = message;
            switch (type) {
                case 'popup-click': {
                    // The required element may not exist yet
                    const check = () => {
                        const element: HTMLElement | null = document.querySelector(data);
                        if (element) {
                            element.click();
                            respond({id});
                        } else {
                            requestIdleCallback(check, {timeout: 500});
                        }
                    };

                    check();
                    break;
                }
                case 'popup-exists': {
                    // The required element may not exist yet
                    const check = () => {
                        const element: HTMLElement | null = document.querySelector(data);
                        if (element) {
                            respond({id, data: true});
                        } else {
                            requestIdleCallback(check, {timeout: 500});
                        }
                    };

                    check();
                    break;
                }
                case 'popup-saveFile': {
                    const {name, content} = data;
                    saveFile(name, content);
                    respond({id});
                    break;
                }
                default:
            }
        } catch (err) {
            respond({error: String(err)});
        }
    };
}
