import {html} from 'malevic';
import SiteToggle from '../site-toggle';
import {Shortcut, Toggle} from '../../../controls';
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
                        {multiline('This page is protected', 'by browser')}
                    </span>
                ) : tab.isInDarkList ? (
                    <span class="header__site-toggle__unable-text">
                        {multiline('This site is in global', 'Dark List')}
                    </span>
                ) : (
                    <Shortcut
                        commandName="addSite"
                        shortcuts={data.shortcuts}
                        textTemplate={(hotkey) => (hotkey
                            ? multiline('toggle current site', hotkey)
                            : multiline('setup current site', 'toggle hotkey')
                        )}
                        onSetShortcut={(shortcut) => actions.setShortcut('addSite', shortcut)}
                    />
                )}
            </div>
            <div class="header__control header__app-toggle">
                <Toggle checked={data.enabled} labelOn="On" labelOff="Off" onChange={toggleExtension} />
                <Shortcut
                    commandName="toggle"
                    shortcuts={data.shortcuts}
                    textTemplate={(hotkey) => (hotkey
                        ? multiline('toggle extension', hotkey)
                        : multiline('setup extension', 'toggle hotkey')
                    )}
                    onSetShortcut={(shortcut) => actions.setShortcut('toggle', shortcut)}
                />
            </div>
        </header>
    );
}
