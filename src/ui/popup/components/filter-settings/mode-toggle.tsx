import {html} from 'malevic';
import {Button, Toggle} from '../../../controls';
import {Extension} from '../../../../definitions';

export default function ModeToggle({ext}: {ext: Extension}) {
    return (
        <div class="mode-toggle">
            <div class="mode-toggle__line">
                <Button
                    class={{'mode-toggle__button--active': ext.config.mode === 1}}
                    onclick={() => ext.setConfig({mode: 1})}
                >
                    <span class="icon icon--dark-mode"></span>
                </Button>
                <Toggle
                    checked={ext.config.mode === 1}
                    labelOn="Dark"
                    labelOff="Light"
                    onChange={(checked) => ext.setConfig({mode: checked ? 1 : 0})}
                />
                <Button
                    class={{'mode-toggle__button--active': ext.config.mode === 0}}
                    onclick={() => ext.setConfig({mode: 0})}
                >
                    <span class="icon icon--light-mode"></span>
                </Button>
            </div>
            <label class="mode-toggle__label">Mode</label>
        </div>
    );
}
