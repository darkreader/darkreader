import {m} from 'malevic';
import {ViewProps} from '../types';
import {Button} from '../../controls';

export default function ExportButton(props: ViewProps) {
    function exportSettings() {
        const data = JSON.stringify(props.data.settings);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], {type: 'text/json'}));
        a.download = 'DarkReader_Settings.json';
        a.click();
    }

    return (
        <Button
            onclick={exportSettings}
        >
            Export Settings
        </Button>
    );
}
