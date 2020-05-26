import {m} from 'malevic';
import {ViewProps} from '../types';
import ControlGroup from '../control-group';
import {Input} from '../../controls';
import {UserSettings} from '../../../definitions';

export default function ImportButton(props: ViewProps) {
    function importSettings() {
        if (this.files.length > 0) {
            const reader = new FileReader();
            //TODO add reader.error
            reader.onload = function(e) { 
                try {
                    const content: UserSettings = JSON.parse(e.target.result as string);
                    props.actions.changeSettings({...content});
                } catch {
                    //Make error failing parsing
                    ;;
                }
            }
            reader.readAsText(this.files[0]);
        }

    }

    return (
        <ControlGroup>
            <ControlGroup.Control>
                <Input onchange={importSettings} class="File-Input">
                    Import Settings
                </Input>
            </ControlGroup.Control>
        </ControlGroup>
    );
}
