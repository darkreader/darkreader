import {html} from 'malevic';
import {getLocalMessage} from '../../../../utils/locales';
import {FilterConfig} from '../../../../definitions';
import { Select } from '../../../controls';
<script src="jscolor.js"></script>


interface LinkSettingsProps {
    config: FilterConfig;
    color: string[];
    onChange: (config: Partial<FilterConfig>) => void;
}

export default function LinkSettings({config, color, onChange}: LinkSettingsProps) {
    return (
        <section class="link-settings">
            <div class="link-settings__link-select-container">
                <div class="link-settings__link-select-container__line">
               
                </div>
            </div>
            
        </section>
    );
}
