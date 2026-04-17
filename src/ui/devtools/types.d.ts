import type {DevFixType, DevToolsData, ExtWrapper} from '../../definitions';

export type DevtoolsProps = ExtWrapper & {devtools: DevToolsData};

export interface SiteFix {
    url: string[];
}

export type ConfigEditorProps<T extends SiteFix = SiteFix> = DevtoolsProps & {
    create(url: string): T;
    format(fixes: T[]): string;
    parse(text: string): T[];
    type: DevFixType;
};
