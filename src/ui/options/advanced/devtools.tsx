import {m} from 'malevic';
import {getLocalMessage} from '../../../utils/locales';
import {openExtensionPage} from '../../utils';
import {ControlGroup, NavButton} from '../../controls';

async function openDevTools() {
    await openExtensionPage('devtools');
}

export function DevTools(): Malevic.Child {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={openDevTools} class="advanced__dev-tools-button">
                    🛠 {getLocalMessage('open_dev_tools')}
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('dev_tools_description')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
