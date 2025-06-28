import {m} from 'malevic';

import {getLocalMessage} from '../../../utils/locales';
import {ControlGroup, NavButton} from '../../controls';
import {openExtensionPage} from '../../utils';

async function openDevTools() {
    await openExtensionPage('devtools');
}

export function DevTools(): Malevic.Child {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <NavButton onClick={openDevTools} class="advanced__dev-tools-button">
                    🛠 {getLocalMessage('devtools_button')}
                </NavButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('make_fix_for_website')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
