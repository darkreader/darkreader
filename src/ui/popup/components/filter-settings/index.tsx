import {html} from 'malevic';
import {UpDown} from '../../../controls';
import EngineSwitch from './engine-switch';
import ModeToggle from './mode-toggle';
import {ExtWrapper} from '../../../../definitions';

export default function FilterSettings({data, actions}: ExtWrapper) {

    const brightness = (
        <UpDown
            value={data.filterConfig.brightness}
            min={50}
            max={150}
            step={10}
            default={100}
            name="Brightness"
            onChange={(value) => actions.setConfig({brightness: value})}
        />
    );

    const contrast = (
        <UpDown
            value={data.filterConfig.contrast}
            min={50}
            max={150}
            step={10}
            default={100}
            name="Contrast"
            onChange={(value) => actions.setConfig({contrast: value})}
        />
    );

    const grayscale = (
        <UpDown
            value={data.filterConfig.grayscale}
            min={0}
            max={100}
            step={10}
            default={0}
            name="Grayscale"
            onChange={(value) => actions.setConfig({grayscale: value})}
        />
    );

    const sepia = (
        <UpDown
            value={data.filterConfig.sepia}
            min={0}
            max={100}
            step={10}
            default={0}
            name="Sepia"
            onChange={(value) => actions.setConfig({sepia: value})}
        />
    );

    return (
        <section class="filter-settings">
            <ModeToggle data={data} actions={actions} />
            {brightness}
            {contrast}
            {/*grayscale*/}
            {sepia}
            <EngineSwitch data={data} actions={actions} />
        </section>
    );
}
