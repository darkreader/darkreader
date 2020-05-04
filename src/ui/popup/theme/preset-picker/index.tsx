import {m} from 'malevic';
import {isURLInList, getURLHost} from '../../../../utils/url';
import {DropDown} from '../../../controls';
import {ViewProps} from '../../types';

export default function PresetPicker(props: ViewProps) {
    const host = getURLHost(props.tab.url || '');
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );

    const defaultPresetName = 'Default theme';
    const customPresetName = `Custom for ${host}`;

    function onPresetChange(name: string) {
        const filteredCustomThemes = props.data.settings.customThemes.filter(({url}) => !isURLInList(props.tab.url, url));
        if (name === defaultPresetName) {
            props.actions.changeSettings({customThemes: filteredCustomThemes});
        } else if (name === customPresetName) {
            const extended = filteredCustomThemes.concat({
                url: [host],
                theme: {...props.data.settings.theme},
            });
            props.actions.changeSettings({customThemes: extended});
        }
    }
    return (
        <DropDown
            class="theme-preset-picker"
            selected={custom ? customPresetName : defaultPresetName}
            values={[
                defaultPresetName,
                customPresetName,
            ]}
            onChange={onPresetChange}
        />
    );
}
