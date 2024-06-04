import type {PLATFORM} from './platform';

type PlatformId = (typeof PLATFORM)[keyof (typeof PLATFORM)];

export interface JSEntry {
    src: string;
    dest: string;
    reloadType: string;
    watchFiles?: string[];
    platform?: PlatformId;
}

export interface CSSEntry {
    src: string;
    dest: string;
    watchFiles?: string[];
}

export interface HTMLEntry {
    title: string;
    path: string;
    hasLoader: boolean;
    hasStyleSheet: boolean;
    hasCompatibilityCheck: boolean;
    reloadType: string;
    platforms?: PlatformId[];
}

export interface CopyEntry {
    path: string;
    reloadType: string;
    platforms?: PlatformId[];
}

export interface TaskOptions {
    platforms: Partial<Record<PlatformId, boolean>>;
    debug: boolean;
    watch: boolean;
    test: boolean;
    log?: string | false;
    version: string | false;
}
