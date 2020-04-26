import {m} from 'malevic';
import {getLocalMessage} from '../../../../utils/locales';
import {Slider} from '../../../controls';
import {formatPercent} from './format';
import ThemeControl from './theme-control';

export default function Grayscale(props: {value: number; onChange: (v: number) => void, resetFunction: () => void}) {
    return (
        <ThemeControl 
        label={getLocalMessage('grayscale')}
        reset={props.resetFunction}>
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
