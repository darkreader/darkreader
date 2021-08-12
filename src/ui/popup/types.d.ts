import type {ExtensionData, ExtensionActions, TabInfo} from '../../definitions';

export interface ViewProps {
    actions: ExtensionActions;
    data: ExtensionData;
    tab: TabInfo;
}
