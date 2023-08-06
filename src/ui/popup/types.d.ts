import type { ExtensionData, ExtensionActions } from '../../definitions';

export interface ViewProps {
    actions: ExtensionActions;
    data: ExtensionData;
    fonts?: string[];
}
