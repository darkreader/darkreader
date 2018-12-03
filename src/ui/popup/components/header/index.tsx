import {html} from 'malevic';
import SiteToggle from '../site-toggle';
import {CheckBox, Shortcut, TimeRangePicker, Toggle} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, TabInfo} from '../../../../definitions';

function multiline(...lines) {
    return lines.join('\n');
}

type HeaderProps = ExtWrapper & {
    tab: TabInfo;
    onMoreToggleSettingsClick: () => void;
};

function getTimeIcon() {
    const time = new Date();
    const hours = time.getHours();
    const minutes = time.getMinutes();

    const cx = 8;
    const cy = 8;
    const lh = 5;
    const lm = 7;
    const ah = ((hours > 11 ? hours - 12 : hours) + minutes / 60) / 12 * Math.PI * 2;
    const am = minutes / 60 * Math.PI * 2;
    const hx = cx + lh * Math.sin(ah);
    const hy = cy - lh * Math.cos(ah);
    const mx = cx + lm * Math.sin(am);
    const my = cy - lm * Math.cos(am);

    return [
        `url('`,
        `data:image/svg+xml;utf-8,`,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">`,
        `<path fill="none" stroke="white" stroke-width="2" d="M${hx},${hy} L${cx},${cy} L${mx},${my}" />`,
        `</svg>`,
        `')`,
    ].join('');
}

export function Header({data, actions, tab, onMoreToggleSettingsClick}: HeaderProps) {

    function toggleExtension(enabled) {
        actions.changeSettings({
            enabled,
            automation: '',
        });
    }

    return (
        <header class="header">
            <img class="header__logo" src="../assets/images/darkreader-type.svg" alt="Dark Reader" />
            <div class="header__control header__site-toggle">
                <SiteToggle
                    data={data}
                    tab={tab}
                    actions={actions}
                />
                {tab.isProtected ? (
                    <span class="header__site-toggle__unable-text">
                        {getLocalMessage('page_protected')}
                    </span>
                ) : tab.isInDarkList ? (
                    <span class="header__site-toggle__unable-text">
                        {getLocalMessage('page_in_dark_list')}
                    </span>
                ) : (
                    <Shortcut
                        commandName="addSite"
                        shortcuts={data.shortcuts}
                        textTemplate={(hotkey) => (hotkey
                            ? multiline(getLocalMessage('toggle_current_site'), hotkey)
                            : getLocalMessage('setup_hotkey_toggle_site')
                        )}
                        onSetShortcut={(shortcut) => actions.setShortcut('addSite', shortcut)}
                    />
                )}
            </div>
            <div class="header__control header__app-toggle">
                <Toggle checked={data.isEnabled} labelOn={getLocalMessage('on')} labelOff={getLocalMessage('off')} onChange={toggleExtension} />
                <Shortcut
                    commandName="toggle"
                    shortcuts={data.shortcuts}
                    textTemplate={(hotkey) => (hotkey
                        ? multiline(getLocalMessage('toggle_extension'), hotkey)
                        : getLocalMessage('setup_hotkey_toggle_extension')
                    )}
                    onSetShortcut={(shortcut) => actions.setShortcut('toggle', shortcut)}
                />
                <span
                    class="header__app-toggle__more-button"
                    onclick={onMoreToggleSettingsClick}
                ></span>
                <span
                    class={{
                        'header__app-toggle__time': true,
                        'header__app-toggle__time--active': data.settings.automation === 'time',
                    }}
                    style={data.settings.automation === 'time' ? {
                        'background-image': getTimeIcon(),
                    } : null}
                ></span>
            </div>
        </header>
    );
}

export function MoreToggleSettings({data, actions, isExpanded, onClose}: ExtWrapper & {isExpanded, onClose}) {
    return (
        <div
            class={{
                'header__app-toggle__more-settings': true,
                'header__app-toggle__more-settings--expanded': isExpanded,
            }}
        >
            <div class="header__app-toggle__more-settings__top">
                <span class="header__app-toggle__more-settings__top__text">{getLocalMessage('time_settings') || 'Time settings'}</span>
                <span class="header__app-toggle__more-settings__top__close" role="button" onclick={onClose}>✕</span>
            </div>
            <div class="header__app-toggle__more-settings__content">
                <div class="header__app-toggle__more-settings__line">
                    <CheckBox
                        checked={data.settings.automation === 'time'}
                        onchange={(e) => actions.changeSettings({automation: e.target.checked ? 'time' : ''})}
                    />
                    <TimeRangePicker
                        startTime={data.settings.time.activation}
                        endTime={data.settings.time.deactivation}
                        onChange={([start, end]) => actions.changeSettings({time: {activation: start, deactivation: end}})}
                    />
                </div>
                <p class="header__app-toggle__more-settings__description">
                    {getLocalMessage('set_active_hours') || 'Set active hours'}
                </p>
            </div>
        </div>
    );
}
