import {m} from 'malevic';
import {ViewProps} from '../types';
import {Button} from '../../controls';
import {saveFile} from '../../utils';
import ControlGroup from '../control-group';

export default function ExportTheme(props: ViewProps) {
    const listener = ({type, data}) => {
        if (type === 'export-css-response') {
            saveFile('Dark-Reader-Settings.css', data);
            chrome.runtime.onMessage.removeListener(listener);
        }
    };

    function exportCSS() {
        chrome.runtime.onMessage.addListener(listener);
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
