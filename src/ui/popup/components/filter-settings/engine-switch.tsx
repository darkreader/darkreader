import {html} from 'malevic';
import {Toggle, Shortcut} from '../../../controls';
import {ExtWrapper} from '../../../../definitions';

export default function EngineSwitch({data, actions}: ExtWrapper) {
    return (
        <div class="engine-switch">
            <Toggle
                checked={data.filterConfig.engine === 'cssFilter'}
                labelOn="Color filter"
                labelOff="Static theme"
                onChange={(checked) => actions.setConfig({engine: checked ? 'cssFilter' : 'staticTheme'})}
            />
            <Shortcut
                commandName="switchEngine"
                shortcuts={data.shortcuts}
                textTemplate={(hotkey) => (hotkey
                    ? `switch theme engine ${hotkey}`
                    : 'setup theme engine switch hotkey'
                )}
            />
        </div>
    );
}
