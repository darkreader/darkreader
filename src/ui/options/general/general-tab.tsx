import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {isFirefox} from '../../../utils/platform';

import {ChangeBrowserTheme} from './change-browser-theme';
import {DetectDarkTheme} from './detect-dark-theme';
import {EnabledByDefault} from './enabled-by-default';
import {EnableForPDF} from './enabled-for-pdf';

export function GeneralTab(props: ViewProps): Malevic.Child {
    return <div class="settings-tab">
        <EnabledByDefault {...props} />
        <DetectDarkTheme {...props} />
        {isFirefox ? null : <EnableForPDF {...props} />}
        {isFirefox ? <ChangeBrowserTheme {...props} /> : null}
    </div>;
}
