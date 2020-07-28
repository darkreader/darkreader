import {m} from 'malevic';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';

export default function StyleStandardElements(props: {value: boolean; onChange: (boolean: any) => void}) {
    const options = [{id: true, content: 'Yes'}, {id: false, content: 'No'}];
    return (
        <ThemeControl label="Style Standard Elements">
            <DropDown
                options={options}
                onChange={props.onChange}
                selected={props.value}
            />
        </ThemeControl>
    );
}
