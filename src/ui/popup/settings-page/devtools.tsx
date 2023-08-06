import { m } from 'malevic';
import { openExtensionPage } from '../../utils';
import { getLocalMessage } from '../../../utils/locales';
import { NavButton } from '../../controls';
import ControlGroup from '../control-group';

async function openDevTools() {
    await openExtensionPage('devtools');
}

export default function DevToolsGroup() {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={openDevTools} class='dev-tools-button'>
                    🛠 {getLocalMessage('open_dev_tools')}
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Make a fix for a website
            </ControlGroup.Description>
        </ControlGroup>
    );
}
