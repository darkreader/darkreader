import {m} from 'malevic';
import {DEFAULT_SETTINGS} from '../../../../defaults';
import type {ViewProps} from '../../../../definitions';
import {ControlGroup, ResetButton} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';

export default function ResetButtonGroup(props: ViewProps) {
    function reset() {
        props.actions.setTheme(DEFAULT_SETTINGS.theme);
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <ResetButton onClick={reset}>
                    {getLocalMessage('reset_to_defaults')}
                </ResetButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                {getLocalMessage('reset_description')}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
