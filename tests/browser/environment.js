import fs from 'fs/promises';
import JestNodeEnvironment from 'jest-environment-node';
import path from 'path';
import puppeteer from 'puppeteer-core';
import {cmd} from 'web-ext';
import {WebSocketServer} from 'ws';
import {generateHTMLCoverageReports} from './coverage.js';
import {getChromePath, getFirefoxPath, chromeExtensionDebugDir, chromeMV3ExtensionDebugDir, firefoxExtensionDebugDir} from './paths.js';
import {createTestServer} from './server.js';

const TEST_SERVER_PORT = 8891;
const CORS_SERVER_PORT = 8892;
const FIREFOX_DEVTOOLS_PORT = 8893;
const POPUP_TEST_PORT = 8894;

class PuppeteerEnvironment extends JestNodeEnvironment.TestEnvironment {
    extensionStartListeners = [];

    async setup() {
        await super.setup();

        const promises = [
            this.createPopupTestServer(),
            createTestServer(TEST_SERVER_PORT),
            createTestServer(CORS_SERVER_PORT),
        ];
        promises.push();

        this.browser = await this.launchBrowser();
        this.global.browser = this.browser;

        promises.push(
            this.openPopupPage(),
            this.openDevtoolsPage(),
            this.createTestPage(),
        );

        const results = await Promise.all(promises);
        this.popupTestServer = results[0];
        this.testServer = results[1];
        this.corsServer = results[2];
        this.extensionPopup = results[3];
        this.extensionDevtools = results[4];
        this.page = results[5];
        this.global.page = this.page;

        this.assignTestGlobals();
    }

    async waitForStartup() {
        if (!this.extensionOrigin) {
            return new Promise((ready) => this.extensionStartListeners.push(ready));
        }
    }

    async launchBrowser() {
        /** @type {import('puppeteer-core').Browser} */
        let browser;
        if (this.global.product === 'chrome') {
            browser = await this.launchChrome(true);
        } else if (this.global.product === 'chrome-mv3') {
            browser = await this.launchChrome(false);
        } else if (this.global.product === 'firefox') {
            browser = await this.launchFirefox();
        }
        // Wait for the extension to start
        await this.waitForStartup();
        return browser;
    }

    async launchChrome(mv2) {
        const extensionDir = mv2 ? chromeExtensionDebugDir : chromeMV3ExtensionDebugDir;
        let executablePath;
        try {
            executablePath = await getChromePath();
        } catch (e) {
            console.error(e);
        }
        return await puppeteer.launch({
            executablePath,
            headless: false,
            args: [
                `--disable-extensions-except=${extensionDir}`,
                `--load-extension=${extensionDir}`,
                '--show-component-extension-options',
            ],
        });
    }

    async launchFirefox() {
        const firefoxPath = await getFirefoxPath();
        const webExtInstance = await cmd.run({
            sourceDir: firefoxExtensionDebugDir,
            firefox: firefoxPath,
            args: ['--remote-debugging-port', FIREFOX_DEVTOOLS_PORT],
        }, {
            shouldExitProgram: false,
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.firefoxInternalUUID = await this.getFirefoxInternalUUID(webExtInstance);
        return await puppeteer.connect({
            browserURL: `http://localhost:${FIREFOX_DEVTOOLS_PORT}`,
        });
    }

    async getFirefoxInternalUUID(webExtInstance) {
        const runner = webExtInstance.extensionRunners[0];
        const firefoxArgs = runner.runningInfo.firefox.spawnargs;
        const profileDir = firefoxArgs[firefoxArgs.indexOf('-profile') + 1];
        const prefsFile = await fs.readFile(path.join(profileDir, 'prefs.js'), 'utf8');
        const extensionsJson = prefsFile
            .match(/user_pref\("extensions.webextensions.uuids", "(.*?)"\);/)[1]
            .replace(/\\"/g, '"');
        const extensionsIds = JSON.parse(extensionsJson);
        return extensionsIds['addon@darkreader.org'];
    }

    async createTestPage() {
        const page = await this.browser.newPage();
        page.setCacheEnabled(false);
        page.on('pageerror', (err) => process.emit('uncaughtException', err));
        if (this.global.product !== 'firefox') {
            await page.coverage.startJSCoverage();
        }
        return page;
    }

    /**
     * @param {string} path
     * @returns {Promise<puppeteer.Page>}
     */
    async openExtensionPage(path) {
        if (this.global.product === 'chrome' || this.global.product === 'chrome-mv3') {
            return await this.openChromePage(path);
        }
        if (this.global.product === 'firefox') {
            return await this.openFirefoxPage(path);
        }
        return null;
    }

    async openPopupPage() {
        return await this.openExtensionPage('/ui/popup/index.html');
    }

    async openDevtoolsPage() {
        return await this.openExtensionPage('/ui/devtools/index.html');
    }

    async getURL(path) {
        // By this point browser should be loaded and extension should be started, but
        // let's wait anuway
        await this.waitForStartup();
        const url = new URL(path, this.extensionOrigin);
        return url.href;
    }

    async getChromiumMV2BackgroundPage() {
        const targets = await this.browser.targets();
        const backgroundTarget = targets.find((t) => t.type() === 'background_page');
        return await backgroundTarget.page();
    }

    async openChromePage(path) {
        const pageURL = await this.getURL(path);
        const extensionPage = await this.browser.newPage();
        await extensionPage.goto(pageURL);

        return extensionPage;
    }

    async openFirefoxPage(path) {
        const extensionPage = await this.browser.newPage();
        // Doesn't resolve due to https://github.com/puppeteer/puppeteer/issues/6616
        extensionPage.goto(`moz-extension://${this.firefoxInternalUUID}${path}`);
        await new Promise((promise) => setTimeout(promise, 1000));
        return extensionPage;
    }

    assignTestGlobals() {
        this.global.loadTestPage = async (paths, gotoOptions) => {
            const {cors, ...testPaths} = paths;
            this.testServer.setPaths(testPaths);
            cors && this.corsServer.setPaths(cors);
            const {page} = this;
            await page.bringToFront();
            await page.goto(`http://localhost:${TEST_SERVER_PORT}`, gotoOptions);
            // TODO: Determine why sometimes tests are executed before content script
            await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1000)));
        };
        this.global.corsURL = this.corsServer.url;
    }

    async createPopupTestServer() {
        // Puppeteer cannot evaluate scripts in moz-extension:// pages
        // https://github.com/puppeteer/puppeteer/issues/6616
        return new Promise((resolve) => {
            const wsServer = new WebSocketServer({port: POPUP_TEST_PORT});
            const sockets = new Set();
            const resolvers = new Map();
            const rejectors = new Map();
            let idCount = 0;

            wsServer.on('listening', () => resolve(wsServer));

            wsServer.on('connection', async (ws) => {
                sockets.add(ws);
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.id === null && message.data.extensionOrigin) {
                        // This is the initial message which contains extension's URL origin
                        // and signals that extenstion is ready
                        this.extensionOrigin = message.data.extensionOrigin;
                        this.extensionStartListeners.forEach((ready) => ready());
                    } else if (message.error) {
                        const reject = rejectors.get(message.id);
                        reject(message.error);
                    } else {
                        const resolve = resolvers.get(message.id);
                        resolve(message.data);
                    }
                    resolvers.delete(message.id);
                    rejectors.delete(message.id);
                });
                ws.on('close', () => sockets.delete(ws));
            });

            function sendToUIPage(type, data) {
                return new Promise((resolve, reject) => {
                    resolvers.set(idCount, resolve);
                    rejectors.set(idCount, reject);
                    const json = JSON.stringify({type, data, id: idCount});
                    sockets.forEach((ws) => ws.send(json));
                    idCount++;
                });
            }

            this.global.popupUtils = {
                click: async (selector) => await sendToUIPage('click', selector),
                exists: async (selector) => await sendToUIPage('exists', selector),
            };

            this.global.devtoolsUtils = {
                paste: async (fixes) => await sendToUIPage('debug-devtools-paste', fixes),
                reset: async () => await sendToUIPage('debug-devtools-reset'),
            };

            this.global.backgroundUtils = {
                changeSettings: async (settings) => await sendToUIPage('changeSettings', settings),
                collectData: async () => await sendToUIPage('collectData'),
                changeChromeStorage: async (region, data) => await sendToUIPage('changeChromeStorage', {region, data}),
                getChromeStorage: async (region, keys) => await sendToUIPage('getChromeStorage', {region, keys}),
                setDataIsMigratedForTesting: async (value) => await sendToUIPage('setDataIsMigratedForTesting', value),
                emulateMedia: async (name, value) => {
                    if (this.global.product === 'firefox') {
                        return;
                    }
                    let page;
                    if (this.global.product === 'chrome-mv3') {
                        page = this.page;
                    } else if (this.global.product === 'chrome') {
                        page = await this.getChromiumMV2BackgroundPage();
                    }
                    await page.emulateMediaFeatures([{name, value}]);
                },
                getManifest: async () => await sendToUIPage('getManifest'),
            };
        });
    }

    async teardown() {
        await super.teardown();

        const promises = [];
        if (this.global.product !== 'firefox' && this.page?.coverage) {
            const coverage = await this.page.coverage.stopJSCoverage();
            const dir = './tests/browser/coverage/';
            const promise = generateHTMLCoverageReports(dir, coverage);
            promise.then(() => console.info('Coverage reports generated in', dir));
            promises.push(promise);
        }

        // Note: this.browser.close() will close all tabs, so no need to close them
        // explicitly
        promises.push([
            this.testServer?.close(),
            this.corsServer?.close(),
            this.popupTestServer?.close(),
            this.browser?.close(),
        ]);
        await Promise.all(promises);
    }
}

export default PuppeteerEnvironment;
