import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {Button, CheckBox, DropDown, MultiSwitch, Slider} from '../../../controls';
import SiteToggle from '../site-toggle';
import ThemeEngines from '../../../../generators/theme-engines';
import {DONATE_URL, getHelpURL} from '../../../../utils/links';
import {getLocalMessage} from '../../../../utils/locales';
import {isURLEnabled, isURLInList, getURLHost} from '../../../../utils/url';
import {ExtensionData, ExtensionActions, TabInfo, FilterConfig} from '../../../../definitions';
import {isMobile} from '../../../../utils/platform';

type Theme = FilterConfig;

interface MobileBodyProps {
    data: ExtensionData;
    tab: TabInfo;
    actions: ExtensionActions;
}

function Logo() {
    return (
        <a
            class="m-logo"
            href="https://darkreader.org/"
            target="_blank"
            rel="noopener noreferrer"
        >
            Dark Reader
        </a>
    );
}

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

function SiteToggleGroup(props: MobileBodyProps) {
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

function SwitchGroup(props: MobileBodyProps) {
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

function ThemeGroup(props: MobileBodyProps) {
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

function MainPage(props: MobileBodyProps & {onSettingsNavClick: () => void}) {
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

function CheckButton(props: {checked: boolean; label: string; description: string; onChange: (checked: boolean) => void}) {
    return (
        <span class="m-check-button">
            <CheckBox
                class="m-check-button__checkbox"
                checked={props.checked}
                onchange={(e: {target: HTMLInputElement}) => props.onChange(e.target.checked)}
            >
                {props.label}
            </CheckBox>
            <label class="m-check-button__description">
                {props.description}
            </label>
        </span>
    );
}

function HelpGroup() {
    return (
        <div class="m-help-group">
            <a class="m-help-button" href={getHelpURL()} target="_blank" rel="noopener noreferrer">
                <span class="m-help-button__text">
                    {getLocalMessage('help')}
                </span>
            </a>
            <label class="m-help-description">
                Read the manual
            </label>
        </div>
    );
}

function DevToolsGroup(props: MobileBodyProps) {
    const globalThemeEngine = props.data.settings.theme.engine;
    const devtoolsData = props.data.devtools;
    const hasCustomFixes = (
        (globalThemeEngine === ThemeEngines.dynamicTheme && devtoolsData.hasCustomDynamicFixes) ||
        ([ThemeEngines.cssFilter, ThemeEngines.svgFilter].includes(globalThemeEngine) && devtoolsData.hasCustomFilterFixes) ||
        (globalThemeEngine === ThemeEngines.staticTheme && devtoolsData.hasCustomStaticFixes)
    );

    return (
        <div class="m-devtools-group">
            <Button
                onclick={openDevTools}
                class={{
                    'dev-tools-button': true,
                    'dev-tools-button--has-custom-fixes': hasCustomFixes,
                }}
            >
                🛠 {getLocalMessage('open_dev_tools')}
            </Button>
            <label class="m-devtools-description">
                Make a fix for a website
            </label>
        </div>
    );
}

function BackButton(props: {onClick: () => void}) {
    return (
        <Button class="m-back-button" onclick={props.onClick}>
            Back
        </Button>
    );
}

function openDevTools() {
    chrome.windows.create({
        type: 'panel',
        url: 'ui/devtools/index.html',
        width: 600,
        height: 600,
    });
}

function SettingsPage(props: MobileBodyProps & {onBackClick: () => void}) {
    function onEnabledByDefaultChange(checked: boolean) {
        props.actions.changeSettings({applyToListedOnly: !checked});
    }

    return (
        <Array>
            <section class="m-section">
                <CheckButton
                    checked={!props.data.settings.applyToListedOnly}
                    label="Enable by default"
                    description={props.data.settings.applyToListedOnly ?
                        'Disabled on all websites by default' :
                        'Enabled on all websites by default'}
                    onChange={onEnabledByDefaultChange}
                />
                <DevToolsGroup {...props} />
                <HelpGroup />
            </section>
            <section class="m-section">
                <BackButton onClick={props.onBackClick} />
            </section>
        </Array>
    );
}

function Paginator(props: MobileBodyProps) {
    const context = getContext();
    const store = context.store as {
        activePage: 'main' | 'settings';
    };

    function onSettingsNavClick() {
        store.activePage = 'settings';
        context.refresh();
    }

    function onSettingsBackClick() {
        store.activePage = 'main';
        context.refresh();
    }

    return (
        <div class="m-paginator">
            <div class="m-paginator__main-page">
                <MainPage
                    {...props}
                    onSettingsNavClick={onSettingsNavClick}
                />
            </div>
            <div
                class={{
                    'm-paginator__settings-page': true,
                    'm-paginator__settings-page--active': store.activePage === 'settings',
                }}
            >
                <SettingsPage {...props} onBackClick={onSettingsBackClick} />
            </div>
        </div>
    );
}

function DonateGroup() {
    return (
        <div class="m-donate-group">
            <a class="m-donate-button" href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                <span class="m-donate-button__text">
                    {getLocalMessage('donate')}
                </span>
            </a>
            <label class="m-donate-description">
                This project is sponsored by you
            </label>
        </div>
    );
}

export default function MobileBody(props: MobileBodyProps) {
    function preventContextMenu() {
        if (isMobile()) {
            window.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }

    return (
        <body oncreate={preventContextMenu}>
            <section class="m-section">
                <Logo />
            </section>
            <section class="m-section">
                <Paginator {...props} />
            </section>
            <section class="m-section">
                <DonateGroup />
            </section>
        </body>
    );
}
