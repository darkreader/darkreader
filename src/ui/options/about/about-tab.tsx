import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';
import {GITHUB_URL} from '../../../utils/links';

import {AppVersion} from './version';

interface AboutTabProps {
    plus?: boolean;
}

export function AboutTab(_props: ViewProps & AboutTabProps): Malevic.Child {
    return <div class="settings-tab about-tab">
        <AppVersion />
        <div>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                GitHub
            </a>
        </div>
    </div>;
}
