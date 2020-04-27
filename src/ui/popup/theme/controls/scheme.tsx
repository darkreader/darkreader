import {m} from 'malevic';
import {getLocalMessage} from '../../../../utils/locales';
import {DropDown} from '../../../controls';
import ThemeControl from './theme-control';

export default function Scheme(props: {isDark: boolean; onChange: (dark: boolean) => void}) {
    const valDark = getLocalMessage('dark');
    const valLight = getLocalMessage('light');
    return (
        <ThemeControl label="Scheme">
            <DropDown
                selected={props.isDark ? valDark : valLight}
                values={[
                    valDark,
                    valLight,
                ]}
                onChange={(v) => props.onChange(v === valDark)}
            />
        </ThemeControl>
    );
}
