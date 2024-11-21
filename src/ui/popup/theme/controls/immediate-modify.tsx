import {m} from 'malevic';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';
import {getLocalMessage} from '../../../../utils/locales';

export default function ImmediateModify(props: {value: boolean; onChange: (value: boolean) => void}) {
    const options = [{id: true, content: getLocalMessage('yes')}, {id: false, content: getLocalMessage('no')}];
    return (
        <ThemeControl label={getLocalMessage('immediate_modify')}>
            <DropDown
                options={options}
                onChange={props.onChange}
                selected={props.value}
            />
        </ThemeControl>
    );
}
