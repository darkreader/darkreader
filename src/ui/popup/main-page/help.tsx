import {m} from 'malevic';
import {getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import ControlGroup from '../control-group';

export default function HelpGroup() {
    return (
        <ControlGroup>
            <ControlGroup.Control>
                <a class="m-help-button" href={getHelpURL()} target="_blank" rel="noopener noreferrer">
                    <span class="m-help-button__text">
                        {getLocalMessage('help')}
                    </span>
                </a>
            </ControlGroup.Control>
        </ControlGroup>
    );
}
