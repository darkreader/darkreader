import {html} from 'malevic';
import SiteToggle from '../site-toggle';
import {Shortcut, Toggle} from '../../../controls';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper, TabInfo} from '../../../../definitions';

function multiline(...lines) {
    return lines.join('\n');
}

export default function TopSection({data, actions, tab}: ExtWrapper & {tab: TabInfo}) {

    function toggleExtension(enabled) {
        if (enabled) {
            actions.enable();
        } else {
            actions.disable();
        }
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
                <Toggle checked={data.enabled} labelOn={getLocalMessage('on')} labelOff={getLocalMessage('off')} onChange={toggleExtension} />
                <Shortcut
                    commandName="toggle"
                    shortcuts={data.shortcuts}
                    textTemplate={(hotkey) => (hotkey
                        ? multiline(getLocalMessage('toggle_extension'), hotkey)
                        : getLocalMessage('setup_hotkey_toggle_extension')
                    )}
                    onSetShortcut={(shortcut) => actions.setShortcut('toggle', shortcut)}
                />
            </div>
        </header>
    );
}
