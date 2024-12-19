import {m} from 'malevic';

import {HELP_URL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {ControlGroup} from '../../controls';

export default function HelpGroup() {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <a class="m-help-button" href={`${HELP_URL}/v5/`} target="_blank" rel="noopener noreferrer">
                    <span class="m-help-button__text">
                        {getLocalMessage('help')}
                    </span>
                </a>
            </ControlGroup.Control>
        </ControlGroup>
    );
}
