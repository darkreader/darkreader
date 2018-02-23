import {html} from 'malevic';
import SiteToggle from './site-toggle';
import {Shortcut, Toggle} from '../../controls';
import {Extension} from '../../../definitions';

function multiline(...lines) {
    return lines.join('\n');
}

export default function TopSection({ext}: {ext: Extension}) {

    function toggleExtension(enabled) {
        if (enabled) {
            ext.enable();
        } else {
            ext.disable();
        }
    }

    return (
        <section class="top-controls">
            <div class="top-controls__control" id="site-toggle-container">
                <SiteToggle
                    ext={ext}
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
            <div class="top-controls__control">
                <Toggle checked={ext.enabled} labelOn="On" labelOff="Off" onChange={toggleExtension} />
                <Shortcut
                    commandName="toggle"
                    textTemplate={(hotkey) => (hotkey
                        ? multiline('toggle extension', hotkey)
                        : multiline('setup extension', 'toggle hotkey')
                    )}
                />
            </div>
        </section>
    );
}
