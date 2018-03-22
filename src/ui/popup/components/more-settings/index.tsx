import {html} from 'malevic';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import {ExtWrapper} from '../../../../definitions';

export default function MoreSettings({data, actions}: ExtWrapper) {
    return (
        <section class="more-settings">
            <div class="more-settings__section">
                <FontSettings data={data} actions={actions} />
            </div>
            <div class="more-settings__section">
                <p class="more-settings__description">
                    Try out experimental theme engines<br />
                    <strong>Filter+</strong> preserves colors saturation<br />
                    <strong>Static theme</strong> generates a simple fast theme
                </p>
                <EngineSwitch data={data} actions={actions} />
            </div>
        </section>
    );
}

