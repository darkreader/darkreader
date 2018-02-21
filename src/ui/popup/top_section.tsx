import { html } from 'malevic';
import SiteToggle from './site_toggle';
import { Row, Col, Button, Shortcut, Toggle } from '../controls';
import { Extension } from '../../definitions';

export default function TopSection({ ext }: { ext: Extension }) {

    function multiline(...lines) {
        return lines.join('\n');
    }

    return (
        <Row id="top">
            <Col class="control-сontainer" id="site-toggle-container">
                <SiteToggle
                    ext={ext}
                />
                <Shortcut
                    commandName="addSite"
                    class={{ 'disabled': !ext.enabled }}
                    textTemplate={(hotkey) => (hotkey
                        ? multiline('toggle current site', hotkey)
                        : multiline('setup current site', 'toggle hotkey')
                    )}
                />
            </Col>
            <Col class="control-container">
                <Toggle checked={ext.enabled} labelOn="On" labelOff="Off" />
                <Shortcut
                    commandName="toggle"
                    textTemplate={(hotkey) => (hotkey
                        ? multiline('toggle extension', hotkey)
                        : multiline('setup extension', 'toggle hotkey')
                    )}
                />
            </Col>
        </Row>
    );
}
