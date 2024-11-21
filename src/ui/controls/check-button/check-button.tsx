import {m} from 'malevic';

import CheckBox from '../checkbox';
import ControlGroup from '../control-group/control-group';

export default function CheckButton(props: {checked: boolean; label: string; description: string; onChange: (checked: boolean) => void}) {
    return (
        <ControlGroup class="check-button">
            <ControlGroup.Control>
                <CheckBox
                    class="check-button__checkbox"
                    checked={props.checked}
                    onchange={(e: {target: HTMLInputElement}) => props.onChange(e.target.checked)}
                >
                    {props.label}
                </CheckBox>
            </ControlGroup.Control>
            <ControlGroup.Description class="check-button__description">
                {props.description}
            </ControlGroup.Description>
        </ControlGroup>
    );
}
