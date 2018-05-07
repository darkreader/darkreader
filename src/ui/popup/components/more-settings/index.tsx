import {html} from 'malevic';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import {Toggle} from '../../../controls';
import {ExtWrapper} from '../../../../definitions';
import {isFirefox} from '../../../../utils/platform';

export default function MoreSettings({data, actions}: ExtWrapper) {
    return (
        <section class="more-settings">
            <div class="more-settings__section">
                <FontSettings data={data} actions={actions} />
            </div>
            <div class="more-settings__section">
                <p class="more-settings__description">
                    Try out <strong>experimental</strong> theme engines:<br />
                    <strong>Filter+</strong> preserves colors saturation, uses GPU<br />
                    <strong>Static theme</strong> generates a simple fast theme<br />
                    <strong>Dynamic theme</strong> analyzes colors and images
                </p>
                <EngineSwitch data={data} actions={actions} />
            </div>
            {isFirefox() ? (
                <div class="more-settings__section">
                    <Toggle
                        checked={data.filterConfig.changeBrowserTheme}
                        labelOn="Browser theme"
                        labelOff="Default"
                        onChange={(checked) => actions.setConfig({changeBrowserTheme: checked})}
                    />
                    <p class="more-settings__description">
                        Change browser theme
                    </p>
                </div>
            ) : null}
        </section>
    );
}

