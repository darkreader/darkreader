import {html} from 'malevic';
import {UpDown} from '../../../controls';
import ModeToggle from './mode-toggle';
import {getLocalMessage} from '../../../../utils/locales';
import {ExtWrapper} from '../../../../definitions';

export default function FilterSettings({data, actions}: ExtWrapper) {

    const brightness = (
        <UpDown
            value={data.filterConfig.brightness}
            min={50}
            max={150}
            step={10}
            default={100}
            name={getLocalMessage('brightness')}
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
            name={getLocalMessage('contrast')}
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
            name={getLocalMessage('grayscale')}
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
            name={getLocalMessage('sepia')}
            onChange={(value) => actions.setConfig({sepia: value})}
        />
    );

    return (
        <section class="filter-settings">
            <ModeToggle data={data} actions={actions} />
            {brightness}
            {contrast}
            {grayscale}
            {sepia}
        </section>
    );
}
