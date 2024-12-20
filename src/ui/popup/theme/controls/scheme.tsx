import {m} from 'malevic';

import {getLocalMessage} from '../../../../utils/locales';
import {DropDown} from '../../../controls';

import ThemeControl from './theme-control';

export default function Scheme(props: {isDark: boolean; onChange: (dark: boolean) => void}) {
    return (
        <ThemeControl label="Scheme">
            <DropDown
                selected={props.isDark}
                options={[
                    {id: true, content: getLocalMessage('dark')},
                    {id: false, content: getLocalMessage('light')},
                ]}
                onChange={props.onChange}
            />
        </ThemeControl>
    );
}
