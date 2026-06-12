// @ts-check
import {launchBrowserForProduct} from './launch-browser.js';

/** @type {import('puppeteer-core').Browser | null} */
let sharedBrowser = null;

/** @type {boolean} */
let sharedBrowserLaunched = false;

/**
 * @returns {boolean}
 */
export function isSharedBrowserEnabled() {
    return process.env.BROWSER_TEST_REUSE_BROWSER === '1';
}

/**
 * @param {'chrome-mv3' | 'firefox'} product
 * @returns {Promise<void>}
 */
export async function warmSharedBrowser(product) {
    if (!isSharedBrowserEnabled() || sharedBrowser) {
        return;
    }
    sharedBrowser = await launchBrowserForProduct(product);
    sharedBrowserLaunched = true;
}

/**
 * @param {'chrome-mv3' | 'firefox'} product
 * @returns {Promise<{browser: import('puppeteer-core').Browser, owned: boolean}>}
 */
export async function acquireBrowser(product) {
    if (isSharedBrowserEnabled() && sharedBrowser) {
        return {browser: sharedBrowser, owned: false};
    }

    const browser = await launchBrowserForProduct(product);
    if (isSharedBrowserEnabled()) {
        sharedBrowser = browser;
        sharedBrowserLaunched = true;
        return {browser, owned: false};
    }

    return {browser, owned: true};
}

/**
 * @returns {Promise<void>}
 */
export async function closeSharedBrowser() {
    if (sharedBrowserLaunched && sharedBrowser) {
        await sharedBrowser.close().catch(() => {});
        sharedBrowser = null;
        sharedBrowserLaunched = false;
    }
}
