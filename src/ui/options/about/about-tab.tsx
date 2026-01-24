import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {DONATE_URL, HELP_URL, HOMEPAGE_URL, MOBILE_URL, PRIVACY_URL, getHelpURL} from '../../../utils/links';
import {getLocalMessage} from '../../../utils/locales';
import {isMobile} from '../../../utils/platform';

import {AppVersion} from './version';

interface AboutTabProps {
    plus?: boolean;
}

export function AboutTab(props: ViewProps & AboutTabProps): Malevic.Child {
    return <div class="settings-tab about-tab">
        <AppVersion />
        <div>
            <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                Privacy Policy
            </a>
        </div>
        <div>
            <a href={`${HOMEPAGE_URL}/terms/`} target="_blank" rel="noopener noreferrer">
                Terms of Use
            </a>
        </div>
        {isMobile ? null : (
            <div>
                <a href={MOBILE_URL} target="_blank" rel="noopener noreferrer">{getLocalMessage('mobile')}</a>
            </div>
        )}
        <div>
            <a href={props.plus ? `${HELP_URL}/plus/` : getHelpURL()} target="_blank" rel="noopener noreferrer">{getLocalMessage('help')}</a>
        </div>
        {props.plus ? null : isMobile ? (
            <div>
                <a href={`${HOMEPAGE_URL}/plus/`} target="_blank" rel="noopener noreferrer">{getLocalMessage('pay_for_using')}</a>
            </div>
        ) : props.data.uiHighlights.includes('anniversary') ? (
            <div>
                <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">{getLocalMessage('pay_for_using')}</a>
            </div>
        ) : null}
    </div>;
}
