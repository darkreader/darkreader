import {m} from 'malevic';
import {Theme} from '../../../definitions';
import ThemeEngines from '../../../generators/theme-engines';
import {getLocalMessage} from '../../../utils/locales';
import {isURLEnabled, isURLInList, getURLHost} from '../../../utils/url';
import {Button, DropDown, MultiSwitch, Slider} from '../../controls';
import SiteToggle from '../components/site-toggle';
import {ViewProps} from '../types';

function SimpleControl(props: {class?: string}, control: Malevic.Spec, description: string) {
    return (
        <div class={['m-simple-control', props.class]}>
            {control}
            <label class="m-simple-control__description">
                {description}
            </label>
        </div>
    );
}

function ThemeControl(props: {class?: string; label: string}, control: Malevic.Spec) {
    return (
        <div class={['m-theme-control', props.class]}>
            <label class="m-theme-control__label">
                {props.label}
            </label>
            {control}
        </div>
    );
}

interface AppSwitchOptions {
    isOn: boolean;
    isOff: boolean;
    isAuto: boolean;
}

function AppSwitch(props: AppSwitchOptions & {onChange: (opt: AppSwitchOptions) => void}) {
    const values = [
        getLocalMessage('on'),
        'Auto',
        getLocalMessage('off'),
    ];
    const value = props.isOn ? values[0] : props.isOff ? values[2] : values[1];

    function onSwitchChange(v: string) {
        const index = values.indexOf(v);
        props.onChange({
            isOn: index === 0,
            isOff: index === 2,
            isAuto: index === 1,
        });
    }

    return (
        <SimpleControl>
            <MultiSwitch
                class="m-app-switch__control"
                options={values}
                value={value}
                onChange={onSwitchChange}
            />
            {props.isOn ?
                'Extension is enabled' :
                props.isOff ?
                    'Extension is disabled' :
                    'Switches according to system dark mode'}
        </SimpleControl>
    );
}

function SiteToggleGroup(props: ViewProps) {
    const isSiteEnabled = isURLEnabled(props.tab.url, props.data.settings, props.tab);
    return (
        <SimpleControl>
            <SiteToggle
                {...props}
            />
            {isSiteEnabled ?
                'Enabled for current website' :
                'Disabled for current website'}
        </SimpleControl>
    );
}

function SwitchGroup(props: ViewProps) {
    function onAppSwitchChange(opt: AppSwitchOptions) {
        if (opt.isOn) {
            props.actions.changeSettings({
                enabled: true,
                automation: '',
            });
        } else if (opt.isOff) {
            props.actions.changeSettings({
                enabled: false,
                automation: '',
            });
        } else if (opt.isAuto) {
            props.actions.changeSettings({
                automation: 'system',
            });
        }
    }

    return (
        <Array>
            <AppSwitch
                isOn={props.data.settings.enabled === true && !props.data.settings.automation}
                isOff={props.data.settings.enabled === false && !props.data.settings.automation}
                isAuto={Boolean(props.data.settings.automation)}
                onChange={onAppSwitchChange}
            />
            <SiteToggleGroup
                {...props}
            />
        </Array>
    );
}

function formatPercent(v: number) {
    return `${v}%`;
}

function Brightness(props: {value: number; onChange: (v: number) => void}) {
    return (
        <ThemeControl label={getLocalMessage('brightness')}>
            <Slider
                value={props.value}
                min={50}
                max={150}
                step={1}
                formatValue={formatPercent}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}

function Contrast(props: {value: number; onChange: (v: number) => void}) {
    return (
        <ThemeControl label={getLocalMessage('contrast')}>
            <Slider
                value={props.value}
                min={50}
                max={150}
                step={1}
                formatValue={formatPercent}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}

function Scheme(props: {isDark: boolean; onChange: (dark: boolean) => void}) {
    const valDark = getLocalMessage('Dark');
    const valLight = getLocalMessage('Light');
    return (
        <ThemeControl label="Scheme">
            <DropDown
                selected={props.isDark ? valDark : valLight}
                values={[
                    valDark,
                    valLight,
                ]}
                onChange={(v) => props.onChange(v === valDark)}
            />
        </ThemeControl>
    );
}

function Mode(props: {mode: string; onChange: (mode: string) => void}) {
    const modes = [
        [ThemeEngines.dynamicTheme, getLocalMessage('engine_dynamic')],
        [ThemeEngines.cssFilter, getLocalMessage('engine_filter')],
        [ThemeEngines.staticTheme, getLocalMessage('engine_static')],
    ];
    return (
        <ThemeControl label="Mode">
            <DropDown
                selected={modes.find((m) => m[0] === props.mode)[1]}
                values={modes.map((m) => m[1])}
                onChange={(v) => {
                    const mode = modes.find((m) => m[1] === v)[0];
                    props.onChange(mode);
                }}
            />
        </ThemeControl>
    );
}

function ThemeControls(props: {theme: Theme; onChange: (theme: Partial<Theme>) => void}) {
    const {theme, onChange} = props;
    return (
        <section class="m-section m-theme-controls">
            <Brightness
                value={theme.brightness}
                onChange={(v) => onChange({brightness: v})}
            />
            <Contrast
                value={theme.contrast}
                onChange={(v) => onChange({contrast: v})}
            />
            <Scheme
                isDark={theme.mode === 1}
                onChange={(isDark) => onChange({mode: isDark ? 1 : 0})}
            />
            <Mode
                mode={theme.engine}
                onChange={(mode) => onChange({engine: mode})}
            />
        </section>
    );
}

function ThemeGroup(props: ViewProps) {
    const host = getURLHost(props.tab.url || '');
    const custom = props.data.settings.customThemes.find(
        ({url}) => isURLInList(props.tab.url, url)
    );
    const theme = custom ?
        custom.theme :
        props.data.settings.theme;

    function setTheme(config: Partial<Theme>) {
        if (custom) {
            custom.theme = {...custom.theme, ...config};
            props.actions.changeSettings({
                customThemes: props.data.settings.customThemes,
            });
        } else {
            props.actions.setTheme(config);
        }
    }

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
        <div class="m-theme-group">
            <div class="m-theme-group__presets-wrapper">
                <DropDown
                    selected={custom ? customPresetName : defaultPresetName}
                    values={[
                        defaultPresetName,
                        customPresetName,
                    ]}
                    onChange={onPresetChange}
                />
            </div>
            <div class="m-theme-group__controls-wrapper">
                <ThemeControls
                    theme={theme}
                    onChange={setTheme}
                />
            </div>
            <label class="m-theme-group__description">
                Configure theme
            </label>
        </div>
    );
}

function SettingsNavButton(props: {onClick: () => void}) {
    return (
        <Button class="m-settings-button" onclick={props.onClick}>
            <span class="m-settings-button__content">
                <span class="m-settings-button__icon" />
                <span class="m-settings-button__text">Settings</span>
            </span>
        </Button>
    );
}

export default function MainPage(props: ViewProps & {onSettingsNavClick: () => void}) {
    return (
        <Array>
            <section class="m-section">
                <SwitchGroup {...props} />
            </section>
            <section class="m-section">
                <ThemeGroup {...props} />
            </section>
            <section class="m-section">
                <SettingsNavButton onClick={props.onSettingsNavClick} />
            </section>
        </Array>
    );
}
