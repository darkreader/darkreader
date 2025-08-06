import {m} from 'malevic';

import {getLocalMessage} from '../../../../utils/locales';
import {Slider} from '../../../controls';

import {formatPercent} from './format';
import ThemeControl from './theme-control';

export default function Transparency(props: {show: boolean; value: number; onChange: (v: number) => void}) {
    return (
        <div style={{ display: props.show ? '': 'none' }}>
            <ThemeControl label={getLocalMessage('transparency')}>
                <Slider
                    value={props.value}
                    min={0}
                    max={100}
                    step={1}
                    formatValue={formatPercent}
                    onChange={props.onChange}
                />
            </ThemeControl>
        </div>
    );
}
