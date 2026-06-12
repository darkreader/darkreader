// @ts-check
import {runBrowserTestPreflight} from './preflight.js';
import {isSharedBrowserEnabled, warmSharedBrowser} from './shared-browser.js';

export default async function globalSetup() {
    const product = process.env.BROWSER_TEST_PRODUCT || 'chrome-mv3';
    await runBrowserTestPreflight(product, {requireBuild: true});
    if (isSharedBrowserEnabled()) {
        await warmSharedBrowser(product);
    }
}
