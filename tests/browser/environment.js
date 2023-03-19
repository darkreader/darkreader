import {readFile} from 'node:fs/promises';
import JestNodeEnvironment from 'jest-environment-node';
import {join} from 'node:path';
import puppeteer from 'puppeteer-core';
import {cmd} from 'web-ext';
import {WebSocketServer} from 'ws';
import {generateHTMLCoverageReports} from './coverage.js';
import {getChromePath, getFirefoxPath, chromeExtensionDebugDir, chromeMV3ExtensionDebugDir, firefoxExtensionDebugDir} from './paths.js';
import {createTestServer, generateRandomId} from './server.js';

const TEST_SERVER_PORT = 8891;
const CORS_SERVER_PORT = 8892;
const FIREFOX_DEVTOOLS_PORT = 8893;
const POPUP_TEST_PORT = 8894;

class PuppeteerEnvironment extends JestNodeEnvironment.TestEnvironment {
    extensionStartListeners = [];
    pageEventListeners = new Map();

    async setup() {
        await super.setup();

        const promises = [
            this.createMessageServer(),
            createTestServer(TEST_SERVER_PORT),
            createTestServer(CORS_SERVER_PORT),
        ];

        this.browser = await this.launchBrowser();

        promises.push(
            this.createTestPage(),
            this.openPopupPage(),
            this.openDevtoolsPage(),
        );

        const results = await Promise.all(promises);
        this.messageServer = results[0];
        this.testServer = results[1];
        this.corsServer = results[2];
        this.page = results[3];

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
        // Explanation of these options:
        // https://pptr.dev/guides/chrome-extensions
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
            noReload: true,
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
        const prefsFile = await readFile(join(profileDir, 'prefs.js'), 'utf8');
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
        const targets = this.browser.targets();
        const backgroundTarget = targets.find((t) => t.type() === 'background_page');
        return await backgroundTarget.page();
    }

    async awaitForEvent(uuid) {
        return new Promise((resolve) => {
            if (this.pageEventListeners.has(uuid)) {
                this.pageEventListeners.get(uuid).push(resolve);
            } else {
                this.pageEventListeners.set(uuid, [resolve]);
            }
        });
    }

    async pageGoto(page, url, gotoOptions) {
        // Normalize URL
        const pathname = new URL(url).pathname;
        // Depending on external circumstances, page may connect to server before page.goto() reolves
        const promise = this.awaitForEvent(`ready-${pathname}`);
        // Firefox does not resolve page.goto()
        await page.goto(url, gotoOptions);
        return promise;
    }

    onPageEventResponse(eventUUID) {
        const resolves = this.pageEventListeners.get(eventUUID);
        this.pageEventListeners.delete(eventUUID);
        resolves && resolves.forEach((r) => r());
    }

    async openChromePage(path) {
        const pageURL = await this.getURL(path);
        const extensionPage = await this.browser.newPage();
        await this.pageGoto(extensionPage, pageURL);

        return extensionPage;
    }

    async openFirefoxPage(path) {
        console.error('PATH', path)
        const extensionPage = await this.browser.newPage();
        // Doesn't resolve due to https://github.com/puppeteer/puppeteer/issues/6616
        const url = `moz-extension://${this.firefoxInternalUUID}${path}`;
        console.error('PATH gg', path)
        await this.pageGoto(extensionPage, url);
        console.error('PATH qqq', path)
        return extensionPage;
    }

    assignTestGlobals() {
        this.global.getColorScheme = async () => {
            const isDark = await this.page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
            return isDark ? 'dark' : 'light';
        };

        this.global.evaluateScript = async (script) => {
            return await this.page.evaluate(script);
        };

        this.global.expectPageStyles = async (expect, expectations) => {
            if (!Array.isArray(expectations[0])) {
                expectations = [expectations];
            }
            const promises = [];
            for (const [selector, cssAttributeName, expectedValue] of expectations) {
                const promise = expect(this.page.evaluate(
                    (selector, cssAttributeName) => {
                        let element = document;
                        if (!Array.isArray(selector)) {
                            selector = [selector];
                        }
                        for (const part of selector) {
                            if (element instanceof HTMLIFrameElement) {
                                element = element.contentDocument;
                            }
                            if (part === 'document') {
                                element = element.documentElement;
                            } else {
                                element = element.querySelector(part);
                            }
                        }
                        const style = getComputedStyle(element);
                        return style[cssAttributeName];
                    },
                    selector, cssAttributeName
                )).resolves.toBe(expectedValue);
                promises.push(promise);
            }
            return Promise.all(promises);
        };

        this.global.emulateMedia = async (name, value) => {
            if (this.global.product === 'firefox') {
                return;
            }
            await this.page.emulateMediaFeatures([{name, value}]);
            if (this.global.product === 'chrome') {
                const page = await this.getChromiumMV2BackgroundPage();
                await page.emulateMediaFeatures([{name, value}]);
            }
        };

        this.global.loadTestPage = async (paths, gotoOptions) => {
            const {cors, ...testPaths} = paths;
            this.testServer.setPaths(testPaths);
            cors && this.corsServer.setPaths(cors);
            const {page} = this;
            await page.bringToFront();
            await this.pageGoto(page, `http://localhost:${TEST_SERVER_PORT}`, gotoOptions);
        };

        this.global.corsURL = this.corsServer.url;
    }

    async createMessageServer() {
        const awaitForEvent = this.awaitForEvent.bind(this);

        // Puppeteer cannot evaluate scripts in moz-extension:// pages
        // https://github.com/puppeteer/puppeteer/issues/6616
        return new Promise((resolve) => {
            const wsServer = new WebSocketServer({port: POPUP_TEST_PORT});
            let backgroundSocket = null;
            let devToolsSocket = null;
            const popupSockets = new Set();
            const pageSockets = new Set();
            const resolvers = new Map();
            const rejectors = new Map();

            wsServer.on('listening', () => resolve(wsServer));

            wsServer.on('connection', async (ws) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.id === null && message.data && message.data.type === 'background' && message.data.extensionOrigin) {
                        // This is the initial message which contains extension's URL origin
                        // and signals that extenstion is ready
                        this.extensionOrigin = message.data.extensionOrigin;
                        this.extensionStartListeners.forEach((ready) => ready());
                        ws.on('close', () => backgroundSocket = null);
                        backgroundSocket = ws;
                    } else if (message.id === null && message.data && message.data.type === 'devtools') {
                        ws.on('close', () => devToolsSocket = null);
                        devToolsSocket = ws;
                        this.onPageEventResponse(message.data.uuid);
                    } else if (message.id === null && message.data && message.data.type === 'popup') {
                        ws.on('close', () => popupSockets.delete(ws));
                        popupSockets.add(ws);
                        this.onPageEventResponse(message.data.uuid);
                    } else if (message.id === null && message.data && message.data.type === 'page') {
                        if (message.data.message === 'page-ready') {
                            ws.on('close', () => pageSockets.delete(ws));
                            pageSockets.add(ws);
                        }
                        this.onPageEventResponse(message.data.uuid);
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
            });


            function sendToContext(sockets, type, data) {
                return new Promise((resolve, reject) => {
                    const id = generateRandomId();
                    resolvers.set(id, resolve);
                    rejectors.set(id, reject);
                    const json = JSON.stringify({type, data, id});
                    for (const ws of sockets) {
                        ws.send(json);
                    }
                });
            }

            function sendToPopup(type, data) {
                return sendToContext(Array.from(popupSockets), type, data);
            }

            function sendToDevTools(type, data) {
                return sendToContext([devToolsSocket], type, data);
            }

            function sendToBackground(type, data) {
                return sendToContext([backgroundSocket], type, data);
            }

            async function applyDevtoolsConfig(type, fixes) {
                const promise = awaitForEvent('darkreader-dynamic-theme-ready');
                await sendToDevTools(type, fixes);
                await promise;
            }

            this.global.popupUtils = {
                click: async (selector) => await sendToPopup('click', selector),
                exists: async (selector) => await sendToPopup('exists', selector),
            };

            this.global.devtoolsUtils = {
                paste: async (fixes) => await applyDevtoolsConfig('debug-devtools-paste', fixes),
                reset: async () => await applyDevtoolsConfig('debug-devtools-reset'),
            };

            this.global.backgroundUtils = {
                changeSettings: async (settings) => await sendToBackground('changeSettings', settings),
                collectData: async () => await sendToBackground('collectData'),
                changeChromeStorage: async (region, data) => await sendToBackground('changeChromeStorage', {region, data}),
                getChromeStorage: async (region, keys) => await sendToBackground('getChromeStorage', {region, keys}),
                getManifest: async () => await sendToBackground('getManifest'),
            };

            this.global.awaitForEvent = awaitForEvent;
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
            this.messageServer?.close(),
            this.browser?.close(),
        ]);
        await Promise.all(promises);
    }
}

export default PuppeteerEnvironment;
