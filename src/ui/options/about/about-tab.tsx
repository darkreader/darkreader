import {m} from 'malevic';
import {PRIVACY_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {AppVersion} from './version';

export function AboutTab(): Malevic.Child {
    return <div class="settings-tab about-tab">
        <AppVersion />
        <div>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                Privacy Policy
            </a>
        </div>
        <div>
            <a href={getHelpURL()} target="_blank" rel="noopener noreferrer">{getLocalMessage('help')}</a>
        </div>
    </div>;
}
