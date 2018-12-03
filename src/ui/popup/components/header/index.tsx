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

export function Header({data, actions, tab, onMoreToggleSettingsClick}: HeaderProps) {

    function toggleExtension(enabled) {
        actions.changeSettings({enabled});
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
