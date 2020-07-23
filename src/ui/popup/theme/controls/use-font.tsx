import {m} from 'malevic';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';

export default function UseFont(props: {value: boolean; onChange: (v: any) => void}) {
    const options = [{id: true, content: 'Use'}, {id: false, content: "Don't Use"}];
    return (
        <ThemeControl label='Use Font'>
            <DropDown
                options={options}
                onChange={props.onChange}
                selected={props.value}
            />
        </ThemeControl>
    );
}
