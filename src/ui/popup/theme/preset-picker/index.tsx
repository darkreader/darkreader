import {m} from 'malevic';
import {isURLInList, getURLHost} from '../../../../utils/url';
import {DropDown} from '../../../controls';
import {ViewProps} from '../../types';

export default function PresetPicker(props: ViewProps) {
    const host = getURLHost(props.tab.url || '');
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );

    const dropdownOptions = [
        {id: 'default', label: 'Default theme'},
        {id: 'custom', label: `Custom for ${host}`},
    ];

    function onPresetChange(id: string) {
        const filteredCustomThemes = props.data.settings.customThemes.filter(({url}) => !isURLInList(props.tab.url, url));
        if (id === 'default') {
            props.actions.changeSettings({customThemes: filteredCustomThemes});
        } else if (id === 'custom') {
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
            selected={custom ? 'custom' : 'default'}
            options={dropdownOptions}
            onChange={onPresetChange}
        />
    );
}
