import {RequestListener} from 'http';
import {Page} from 'puppeteer-core';

type PathsObject = {[path: string]: string | RequestListener | PathsObject};

declare global {
    const loadTestPage: (paths: PathsObject & {cors?: PathsObject}) => Promise<void>;
    const corsURL: string;
    const page: Page;
}
