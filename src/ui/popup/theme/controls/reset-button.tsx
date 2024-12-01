import {m} from 'malevic';

import {DEFAULT_SETTINGS} from '../../../../defaults';
import type {ViewProps} from '../../../../definitions';
import {ControlGroup, ResetButton} from '../../../controls';

export default function ResetButtonGroup(props: ViewProps) {
    function reset() {
        props.actions.setTheme(DEFAULT_SETTINGS.theme);
    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <ResetButton onClick={reset}>
                    Reset to defaults
                </ResetButton>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Restore current theme values to defaults
            </ControlGroup.Description>
        </ControlGroup>
    );
}
