import {m} from 'malevic';
import {Button} from '../../controls';
import {saveFile} from '../../utils';
import ControlGroup from '../control-group';
import {getURLHostOrProtocol} from '../../../utils/url';
import type {MessageCStoUI, MessageUItoBG} from '../../../definitions';
import {MessageTypeCStoUI, MessageTypeUItoBG} from '../../../utils/message';

export default function ExportTheme() {
    const listener = ({type, data}: MessageCStoUI, sender: chrome.runtime.MessageSender) => {
        if (type === MessageTypeCStoUI.EXPORT_CSS_RESPONSE) {
            const url = getURLHostOrProtocol(sender.tab!.url!).replace(/[^a-z0-1\-]/g, '-');
            saveFile(`DarkReader-${url}.css`, data);
            chrome.runtime.onMessage.removeListener(listener);
        }
    };

    function exportCSS() {
        chrome.runtime.onMessage.addListener(listener);
        chrome.runtime.sendMessage<MessageUItoBG>({type: MessageTypeUItoBG.REQUEST_EXPORT_CSS});
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Button
                    onclick={exportCSS}
                    class="settings-button"
                >
                    Export Dynamic Theme
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Save generated CSS to a file
            </ControlGroup.Description>
        </ControlGroup>
    );
}
