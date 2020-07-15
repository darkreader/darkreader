import {m} from 'malevic';
import {isURLInList, isURLMatched, getURLHost} from '../../../../utils/url';
import {DropDown} from '../../../controls';
import {ViewProps} from '../../types';
import {createUID} from '../../../../utils/uid';

export default function PresetPicker(props: ViewProps) {
    const host = getURLHost(props.tab.url || '');
    const preset = props.data.settings.presets.find(
        ({urls}) => isURLInList(props.tab.url, urls)
    );
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );

    const dropdownOptions = [
        {id: 'default', label: 'Default theme'},
        props.data.settings.presets.length === 0 ?
            {id: 'add-preset', label: '+ Create new theme'} : null,
        ...props.data.settings.presets.map((preset) => {
            return {id: preset.id, label: preset.name};
        }),
        {id: 'custom', label: `Custom for ${host}`},
    ].filter(Boolean);

    function onPresetChange(id: string) {
        const filteredCustomThemes = props.data.settings.customThemes.filter(({url}) => !isURLInList(props.tab.url, url));
        const filteredPresets = props.data.settings.presets.map((preset) => {
            return {
                ...preset,
                urls: preset.urls.filter((template) => !isURLMatched(props.tab.url, template)),
            };
        });
        if (id === 'default') {
            props.actions.changeSettings({
                customThemes: filteredCustomThemes,
                presets: filteredPresets,
            });
        } else if (id === 'custom') {
            const extended = filteredCustomThemes.concat({
                url: [host],
                theme: {...props.data.settings.theme},
            });
            props.actions.changeSettings({
                customThemes: extended,
                presets: filteredPresets,
            });
        } else if (id === 'add-preset') {
            const extended = filteredPresets.concat({
                id: `preset-${createUID()}`,
                name: `Theme ${props.data.settings.presets.length + 1}`,
                urls: [host],
                theme: {...props.data.settings.theme},
            });
            props.actions.changeSettings({
                customThemes: filteredCustomThemes,
                presets: extended,
            });
        } else {
            const chosenPresetId = id;
            const extended = filteredPresets.map((preset) => {
                if (preset.id === chosenPresetId) {
                    return {
                        ...preset,
                        urls: preset.urls.concat(host)
                    };
                }
                return preset;
            });
            props.actions.changeSettings({
                customThemes: filteredCustomThemes,
                presets: extended,
            });
        }
    }
    return (
        <DropDown
            class="theme-preset-picker"
            selected={custom ? 'custom' : preset ? preset.id : 'default'}
            options={dropdownOptions}
            onChange={onPresetChange}
        />
    );
}
