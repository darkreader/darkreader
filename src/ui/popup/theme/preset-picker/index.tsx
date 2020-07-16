import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {ThemePreset} from '../../../../definitions';
import {isURLInList, isURLMatched, getURLHost} from '../../../../utils/url';
import {DropDown, MessageBox} from '../../../controls';
import {ViewProps} from '../../types';
import {createUID} from '../../../../utils/uid';

function PresetItem(props: ViewProps & {preset: ThemePreset}) {
    const context = getContext();
    const store = context.store as {isConfirmationVisible: boolean};

    function onRemoveClick(e: MouseEvent) {
        e.stopPropagation();
        store.isConfirmationVisible = true;
        context.refresh();
    }

    function onConfirmRemoveClick() {
        const filtered = props.data.settings.presets.filter((p) => p.id !== props.preset.id);
        props.actions.changeSettings({presets: filtered});
    }

    function onCancelRemoveClick() {
        store.isConfirmationVisible = false;
        context.refresh();
    }

    const confirmation = store.isConfirmationVisible ? (
        <MessageBox
            caption={`Are you sure you want to remove ${props.preset.name}?`}
            onOK={onConfirmRemoveClick}
            onCancel={onCancelRemoveClick}
        />
    ) : null;

    return (
        <span class="theme-preset-picker__preset">
            <span class="theme-preset-picker__preset__name">{props.preset.name}</span>
            <span class="theme-preset-picker__preset__remove-button" onclick={onRemoveClick}></span>
            {confirmation}
        </span>
    );
}

export default function PresetPicker(props: ViewProps) {
    const host = getURLHost(props.tab.url || '');
    const preset = props.data.settings.presets.find(
        ({urls}) => isURLInList(props.tab.url, urls)
    );
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );

    const selectedPresetId = custom ? 'custom' : preset ? preset.id : 'default';

    const defaultOption = {id: 'default', content: 'Default theme'};
    const addNewPresetOption = props.data.settings.presets.length === 0 ?
        {id: 'add-preset', content: '+ Create new theme'} :
        null;
    const userPresetsOptions = props.data.settings.presets.map((preset) => {
        if (preset.id === selectedPresetId) {
            return {id: preset.id, content: preset.name};
        }
        return {
            id: preset.id,
            content: <PresetItem {...props} preset={preset} />
        };
    });
    const customSitePresetOption = {id: 'custom', content: `Custom for ${host}`};

    const dropdownOptions = [
        defaultOption,
        addNewPresetOption,
        ...userPresetsOptions,
        customSitePresetOption,
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
            selected={selectedPresetId}
            options={dropdownOptions}
            onChange={onPresetChange}
        />
    );
}
