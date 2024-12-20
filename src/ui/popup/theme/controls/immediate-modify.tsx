import {m} from 'malevic';

import {DropDown} from '../../../controls';

import ThemeControl from './theme-control';

export default function ImmediateModify(props: {value: boolean; onChange: (value: boolean) => void}) {
    const options = [{id: true, content: 'Yes'}, {id: false, content: 'No'}];
    return (
        <ThemeControl label="Immediate modify">
            <DropDown
                options={options}
                onChange={props.onChange}
                selected={props.value}
            />
        </ThemeControl>
    );
}
