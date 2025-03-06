import {m} from 'malevic';

import {getLocalMessage} from '../../../../utils/locales';
import {Slider} from '../../../controls';

import {formatPercent} from './format';
import ThemeControl from './theme-control';

export default function Grayscale(props: {value: number; onChange: (v: number) => void}) {
    return (
        <ThemeControl label={getLocalMessage('grayscale')}>
            <Slider
                value={props.value}
                min={0}
                max={100}
                step={1}
                formatValue={formatPercent}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}
