import {html} from 'malevic';
import EngineSwitch from '../engine-switch';
import FontSettings from '../font-settings';
import {compileMarkdown} from '../../utils/markdown';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper} from '../../../../definitions';

export default function MoreSettings({data, actions}: ExtWrapper) {
    return (
        <section class="more-settings">
            <div class="more-settings__section">
                <FontSettings data={data} actions={actions} />
            </div>
            <div class="more-settings__section">
                <p class="more-settings__description">
                    {compileMarkdown(getLocalMessage('try_experimental_theme_engines'))}
                </p>
                <EngineSwitch data={data} actions={actions} />
            </div>
        </section>
    );
}

