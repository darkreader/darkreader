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
                {/* TODO: pass site info */true ? (
                    <Shortcut
                        commandName="addSite"
                        textTemplate={(hotkey) => (hotkey
                            ? multiline('toggle current site', hotkey)
                            : multiline('setup current site', 'toggle hotkey')
                        )}
                    />
                ) : (
                        <span id="blocked-by-browser-text">
                            This site is blocked
                            by browser
                        </span>
                    )}
            </div>
            <div class="header__control header__app-toggle">
                <Toggle checked={data.enabled} labelOn="On" labelOff="Off" onChange={toggleExtension} />
                <Shortcut
                    commandName="toggle"
                    textTemplate={(hotkey) => (hotkey
                        ? multiline('toggle extension', hotkey)
                        : multiline('setup extension', 'toggle hotkey')
                    )}
                />
            </div>
        </header>
    );
}
