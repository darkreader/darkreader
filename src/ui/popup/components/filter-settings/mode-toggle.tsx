import {m} from 'malevic';

import {getLocalMessage} from '../../../../utils/locales';
import {Toggle} from '../../../controls';

interface ModeToggleProps {
    mode: number;
    onChange: (mode: number) => void;
}

export default function ModeToggle({mode, onChange}: ModeToggleProps) {
    return (
        <div class="mode-toggle">
            <div class="mode-toggle__line">
                <Toggle
                    checked={mode === 1}
                    labelOn={getLocalMessage('dark')}
                    labelOff={getLocalMessage('light')}
                    onChange={(checked) => onChange(checked ? 1 : 0)}
                />
            </div>
            <label class="mode-toggle__label">{getLocalMessage('mode')}</label>
        </div>
    );
}
