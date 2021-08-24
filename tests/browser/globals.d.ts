import type {RequestListener} from 'http';
import type {Page, WaitForOptions} from 'puppeteer-core';

type PathsObject = {[path: string]: string | RequestListener | PathsObject};

declare global {
    const loadTestPage: (paths: PathsObject & {cors?: PathsObject}, gotoOptions?: WaitForOptions) => Promise<void>;
    const corsURL: string;
    const page: Page;
    const popupUtils: {
        click: (selector: string) => Promise<void>;
        exists: (selector: string) => Promise<boolean>;
        getBoundingRect: (selector: string) => Promise<{left: number; top: number; width: number; height: number}>;
    };
}
