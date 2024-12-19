import {m} from 'malevic';

import {getLocalMessage} from '../../../../utils/locales';
import {Slider} from '../../../controls';

import {formatPercent} from './format';
import ThemeControl from './theme-control';

export default function Contrast(props: {value: number; onChange: (v: number) => void}) {
    return (
        <ThemeControl label={getLocalMessage('contrast')}>
            <Slider
                value={props.value}
                min={50}
                max={150}
                step={1}
                formatValue={formatPercent}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}
