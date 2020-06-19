import {m} from 'malevic';
import {isURLInList, getURLHost} from '../../../../utils/url';
import {DropDown} from '../../../controls';
import {ViewProps} from '../../types';

export default function PresetPicker(props: ViewProps) {
    const host = getURLHost(props.tab.url || '');
    const specificHost = (props.tab.url
        .replace(/^.*?\/{2,3}/, '')
        .replace(/\?.*$/, '')
        .replace(/\/$/, '')
    );

    const defaultPresetName = 'Default theme';
    const customPresetName = `Custom for ${host}`;
    const specificPresetName = `Custom for ${specificHost}`;

    let selected = defaultPresetName;
    if (props.data.settings.customThemes.find(
        ({url}) => isURLInList(host, url)
    )) {
        selected = customPresetName;
    }
    if (props.data.settings.customThemes.find(
        ({url}) => isURLInList(specificHost, url)
    )) {
        selected = specificPresetName;
    }

    const presetNameValues = customPresetName === specificPresetName ? [defaultPresetName, customPresetName] : [defaultPresetName, customPresetName, specificPresetName];

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
        } else if (name === specificPresetName) {
            const extended = filteredCustomThemes.concat({
                url: [specificHost],
                theme: {...props.data.settings.theme},
            });
            props.actions.changeSettings({customThemes: extended});
        }
    }
    return (
        <DropDown
            class="theme-preset-picker"
            selected={selected}
            values={presetNameValues}
            onChange={onPresetChange}
        />
    );
}
