import {html} from 'malevic';
import {Button, Toggle} from '../../../controls';
import {ExtWrapper} from '../../../../definitions';

export default function ModeToggle({data, actions}: ExtWrapper) {
    return (
        <div class="mode-toggle">
            <div class="mode-toggle__line">
                <Button
                    class={{'mode-toggle__button--active': data.filterConfig.mode === 1}}
                    onclick={() => actions.setConfig({mode: 1})}
                >
                    <span class="icon icon--dark-mode"></span>
                </Button>
                <Toggle
                    checked={data.filterConfig.mode === 1}
                    labelOn="Dark"
                    labelOff="Light"
                    onChange={(checked) => actions.setConfig({mode: checked ? 1 : 0})}
                />
                <Button
                    class={{'mode-toggle__button--active': data.filterConfig.mode === 0}}
                    onclick={() => actions.setConfig({mode: 0})}
                >
                    <span class="icon icon--light-mode"></span>
                </Button>
            </div>
            <label class="mode-toggle__label">Mode</label>
        </div>
    );
}
