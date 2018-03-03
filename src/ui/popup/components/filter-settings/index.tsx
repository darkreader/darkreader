import {html} from 'malevic';
import {UpDown} from '../../../controls';
import ModeToggle from './mode-toggle';
import {Extension} from '../../../../definitions';

export default function FilterSettings({ext}: {ext: Extension}) {

    const brightness = (
        <UpDown
            value={ext.filterConfig.brightness}
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
            value={ext.filterConfig.contrast}
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
            value={ext.filterConfig.grayscale}
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
            value={ext.filterConfig.sepia}
            min={0}
            max={100}
            step={10}
            default={0}
            name="Sepia"
            onChange={(value) => ext.setConfig({sepia: value})}
        />
    );

    return (
        <section class="filter-settings">
            <ModeToggle ext={ext} />
            {brightness}
            {contrast}
            {grayscale}
            {sepia}
        </section>
    );
}
