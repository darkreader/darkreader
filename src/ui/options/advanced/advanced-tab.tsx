import {m} from 'malevic';

import type {ViewProps} from '../../../definitions';

import {ContextMenus} from './context-menus';
import {DevTools} from './devtools';
import {EnableForProtectedPages} from './enable-for-protected-pages';
import {ExportSettings} from './export-settings';
import {ImportSettings} from './import-settings';
import {ResetSettings} from './reset-settings';
import {SyncConfig} from './sync-config';
import {SyncSettings} from './sync-settings';

export function AdvancedTab(props: ViewProps): Malevic.Child {
    return <div class="settings-tab">
        <SyncSettings {...props} />
        <SyncConfig {...props} />
        <EnableForProtectedPages {...props} />
        <ContextMenus {...props} />
        <ImportSettings {...props} />
        <ExportSettings {...props} />
        <ResetSettings {...props} />
        <DevTools />
    </div>;
}
