import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ThemePreset, ViewProps} from '../../../../definitions';
import {generateUID} from '../../../../utils/uid';
import {isURLInList, isURLMatched, getURLHostOrProtocol} from '../../../../utils/url';
import {DropDown, MessageBox} from '../../../controls';
import type {DropDownOption} from '../../../controls/dropdown';

interface PresetItemStore {
    isConfirmationVisible: boolean;
}

function PresetItem(props: ViewProps & {preset: ThemePreset}) {
    const context = getContext();
    const store: PresetItemStore = context.store;

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

const MAX_ALLOWED_PRESETS = 3;

export default function PresetPicker(props: ViewProps) {
    const tab = props.data.activeTab;
    const host = getURLHostOrProtocol(tab.url);
    const preset = props.data.settings.presets.find(
        ({urls}) => isURLInList(tab.url, urls)
    );
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(tab.url, url)
    );

    const selectedPresetId = custom ? 'custom' : preset ? preset.id : 'default';

    const defaultOption = {id: 'default', content: 'Theme for all websites'};
    const addNewPresetOption = props.data.settings.presets.length < MAX_ALLOWED_PRESETS ?
        {id: 'add-preset', content: '\uff0b Create new theme'} :
        null;
    const userPresetsOptions = props.data.settings.presets.map((preset) => {
        if (preset.id === selectedPresetId) {
            return {id: preset.id, content: preset.name};
        }
        return {
            id: preset.id,
            content: <PresetItem {...props} preset={preset} />,
        };
    });
    const customSitePresetOption = {
        id: 'custom',
        content: `${selectedPresetId === 'custom' ? '\u2605' : '\u2606'} Theme for ${host}`,
    };

    const dropdownOptions = [
        defaultOption,
        ...userPresetsOptions,
        addNewPresetOption,
        customSitePresetOption,
    ].filter(Boolean) as Array<DropDownOption<string>>;

    function onPresetChange(id: string) {
        const filteredCustomThemes = props.data.settings.customThemes.filter(({url}) => !isURLInList(tab.url, url));
        const filteredPresets = props.data.settings.presets.map((preset) => {
            return {
                ...preset,
                urls: preset.urls.filter((template) => !isURLMatched(tab.url, template)),
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
            let newPresetName: string;
            for (let i = 0; i <= props.data.settings.presets.length; i++) {
                newPresetName = `Theme ${i + 1}`;
                if (props.data.settings.presets.every((p) => p.name !== newPresetName)) {
                    break;
                }
            }

            const extended = filteredPresets.concat({
                id: `preset-${generateUID()}`,
                name: newPresetName!,
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
                        urls: preset.urls.concat(host),
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
