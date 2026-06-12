// @ts-check
import {launch} from 'puppeteer-core';

import {getChromePath, getFirefoxPath, chromeMV3ExtensionDebugDir, firefoxExtensionDebugDir} from './paths.js';
import {FIREFOX_DEVTOOLS_PORT} from './ports.js';

/**
 * @returns {boolean}
 */
export function isBrowserTestHeadless() {
    return process.env.BROWSER_TEST_HEADLESS === '1'
        || process.env.CI === 'true'
        || Boolean(process.env.CI);
}

/**
 * @param {'chrome-mv3' | 'firefox'} product
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
export async function launchBrowserForProduct(product) {
    if (product === 'chrome-mv3') {
        return await launchChrome();
    }
    if (product === 'firefox') {
        return await launchFirefox();
    }
    throw new Error(`Unsupported browser test product: ${product}`);
}

/**
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
export async function launchChrome() {
    const extensionDir = chromeMV3ExtensionDebugDir;
    const executablePath = await getChromePath();
    const headless = isBrowserTestHeadless();
    return await launch({
        args: [
            '--show-component-extension-options',
            ...(headless ? ['--headless=new'] : []),
        ],
        enableExtensions: [extensionDir],
        executablePath,
        headless,
        pipe: true,
    });
}

/**
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
export async function launchFirefox() {
    process.setMaxListeners(process.getMaxListeners() + 1);
    const firefox = await getFirefoxPath();
    const headless = isBrowserTestHeadless();
    const browser = await launch({
        browser: 'firefox',
        executablePath: firefox,
        protocol: 'webDriverBiDi',
        headless,
        args: [`--remote-debugging-port=${FIREFOX_DEVTOOLS_PORT}`],
    });
    await browser.installExtension(firefoxExtensionDebugDir);
    return browser;
}
