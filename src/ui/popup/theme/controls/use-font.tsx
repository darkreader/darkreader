import {m} from 'malevic';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';
import {getLocalMessage} from '../../../../utils/locales';

export default function UseFont(props: {value: boolean; onChange: (value: boolean) => void}) {
    const options = [{id: true, content: getLocalMessage('yes')}, {id: false, content: getLocalMessage('no')}];
    return (
        <ThemeControl label={getLocalMessage('change_font')}>
            <DropDown
                options={options}
                onChange={props.onChange}
                selected={props.value}
            />
        </ThemeControl>
    );
}
