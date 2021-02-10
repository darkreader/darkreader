import {m} from 'malevic';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';

export default function BoldTextBrightness(props: {value: boolean; onChange: (v: boolean) => void}) {
    const options = [{id: true, content: 'Yes'}, {id: false, content: 'No'}];
    return (
        <ThemeControl label="Brighten Bold Text">
            <DropDown
                options={options}
                onChange={props.onChange}
                selected={props.value}
            />
        </ThemeControl>
    );
}
