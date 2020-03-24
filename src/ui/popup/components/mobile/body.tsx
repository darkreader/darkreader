import {m} from 'malevic';
import {Button, DropDown, MultiSwitch, Slider} from '../../../controls';
import SiteToggle from '../site-toggle';
import ThemeEngines from '../../../../generators/theme-engines';
import {DONATE_URL} from '../../../../utils/links';
import {getLocalMessage} from '../../../../utils/locales';
import {isURLEnabled, isURLInList} from '../../../../utils/url';
import {ExtensionData, ExtensionActions, TabInfo, FilterConfig} from '../../../../definitions';

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
    )
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
        <section class="m-section">
            <AppSwitch
                isOn={props.data.settings.enabled === true && !props.data.settings.automation}
                isOff={props.data.settings.enabled === false && !props.data.settings.automation}
                isAuto={Boolean(props.data.settings.automation)}
                onChange={onAppSwitchChange}
            />
            <SiteToggleGroup
                {...props}
            />
        </section>
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

function Sepia(props: {value: number; onChange: (v: number) => void}) {
    return (
        <ThemeControl label={getLocalMessage('sepia')}>
            <Slider
                value={props.value}
                min={0}
                max={100}
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
            <Sepia
                value={theme.sepia}
                onChange={(v) => onChange({sepia: v})}
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

    function preventContextMenu() {
        window.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    return (
        <body oncreate={preventContextMenu}>
            <section class="m-section">
                <Logo />
            </section>
            <SwitchGroup {...props} />
            <ThemeControls
                theme={theme}
                onChange={setTheme}
            />
            <section class="m-section">
                <Button class="m-settings-button">
                    <span class="m-settings-button__content">
                        <span class="m-settings-button__icon" />
                        <span class="m-settings-button__text">Settings</span>
                    </span>
                </Button>
            </section>
            <section class="m-section">
                <DonateGroup />
            </section>
        </body>
    );
}
