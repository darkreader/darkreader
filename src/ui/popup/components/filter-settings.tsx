import {html} from 'malevic';
import {Button, Toggle, UpDown} from '../../controls';
import {Extension} from '../../../definitions';

export default function FilterSettings({ext}: {ext: Extension}) {

    const mode = (
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
                    onChange={(checked) => ext.setConfig({mode: Number(checked)})}
                />
                <Button
                    class={{'mode-toggle__button--active': ext.config.mode === 0}}
                    onclick={() => ext.setConfig({mode: 0})}
                >
                    <span class="icon icon--light-mode"></span>
                </Button>
            </div>
            <span class="mode-toggle__label">Mode</span>
        </div>
    );

    const brightness = (
        <UpDown
            value={ext.config.brightness}
            min={50}
            max={150}
            step={10}
            default={100}
            name="Brightness"
            onChange={(value) => ext.setConfig({brightness: value})}
        />
    );

    const contrast = (
        <UpDown
            value={ext.config.contrast}
            min={50}
            max={150}
            step={10}
            default={100}
            name="Contrast"
            onChange={(value) => ext.setConfig({contrast: value})}
        />
    );

    const grayscale = (
        <UpDown
            value={ext.config.grayscale}
            min={0}
            max={100}
            step={10}
            default={0}
            name="Grayscale"
            onChange={(value) => ext.setConfig({grayscale: value})}
        />
    );

    const sepia = (
        <UpDown
            value={ext.config.sepia}
            min={0}
            max={100}
            step={10}
            default={0}
            name="Sepia"
            onChange={(value) => ext.setConfig({sepia: value})}
        />
    );

    return (
        <div class="filter-settings">
            {mode}
            {brightness}
            {contrast}
            {grayscale}
            {sepia}
        </div>
    );
}
