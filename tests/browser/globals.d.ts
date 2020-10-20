import {Page} from 'puppeteer-core';

declare global {
    const loadTestPage: (paths: {[path: string]: string}) => Promise<void>;
    const page: Page;
}
