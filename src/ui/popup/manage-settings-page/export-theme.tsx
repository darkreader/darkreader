import {m} from 'malevic';
import {ViewProps} from '../types';
import {Button} from '../../controls';
import {saveFile} from '../../utils';
import ControlGroup from '../control-group';

export default function ExportTheme(props: ViewProps) {
    chrome.runtime.onMessage.addListener(({type, data}) => {
        if (data == null) {
            return;
        }
        if (type === 'export-css-response2') {
            saveFile('Dark-Reader-Settings.css', data);
        }
    });

    function exportCSS() {
        chrome.runtime.sendMessage({type: 'export-css-proxy', data: {url: props.tab.url}});
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
                Save generated CSS to a CSS file.
            </ControlGroup.Description>
        </ControlGroup>
    );
}
