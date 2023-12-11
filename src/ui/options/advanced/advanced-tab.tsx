import {m} from 'malevic';
import type {ViewProps} from '../../../definitions';
import {EnableForProtectedPages} from './enable-for-protected-pages';

export function AdvancedTab(props: ViewProps): Malevic.Child {
    return <div class="settings-tab">
        <EnableForProtectedPages {...props} />
    </div>;
}
