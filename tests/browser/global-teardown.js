// @ts-check
import {closeSharedBrowser} from './shared-browser.js';

export default async function globalTeardown() {
    await closeSharedBrowser();
}
