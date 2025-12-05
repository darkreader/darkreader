import {m} from 'malevic';

import type {ViewProps, MessageCStoUI, MessageUItoCS} from '../../../../definitions';
import {MessageTypeCStoUI, MessageTypeUItoCS} from '../../../../utils/message';
import {getURLHostOrProtocol} from '../../../../utils/url';
import {Button} from '../../../controls';
import {saveFile} from '../../../utils';

declare const __CHROMIUM_MV2__: boolean;
declare const __CHROMIUM_MV3__: boolean;
declare const __FIREFOX_MV2__: boolean;
declare const __THUNDERBIRD__: boolean;

export function ExportTheme({data}: ViewProps): Malevic.Child {
    const documentId = data.activeTab.documentId!;
    const tabId = data.activeTab.id;
    const listener = ({type, data}: MessageCStoUI, sender: chrome.runtime.MessageSender) => {
        if (type === MessageTypeCStoUI.EXPORT_CSS_RESPONSE && sender.tab && sender.tab.id === tabId && (
            __CHROMIUM_MV3__ ? sender.documentId === documentId :
                (__CHROMIUM_MV2__ ? (!sender.documentId || sender.documentId === documentId) :
                    ((__FIREFOX_MV2__ || __THUNDERBIRD__) ? (!(sender as any).contextId || (sender as any).contextId === documentId) : true))
        )) {
            const url = getURLHostOrProtocol(sender.tab!.url!).replace(/[^a-z0-1\-]/g, '-');
            saveFile(`DarkReader-${url}.css`, data);
            chrome.runtime.onMessage.removeListener(listener);
        }
    };

    async function exportCSS() {
        if (!data.activeTab || !data.activeTab.id) {
            return;
        }
        chrome.runtime.onMessage.addListener(listener);
        // Here we use both frameId and documentId just in case page had already started navigation away
        chrome.tabs.sendMessage<MessageUItoCS>(data.activeTab.id, {type: MessageTypeUItoCS.EXPORT_CSS}, (__CHROMIUM_MV3__ || __CHROMIUM_MV2__ && documentId) ? {frameId: 0, documentId} : {frameId: 0});
    }

    return (
        <Button
            onclick={exportCSS}
            class="export-theme-button"
        >
            Export Dynamic Theme
        </Button>
    );
}
