import {TestEnvironment} from 'jest-environment-node';
import {launch, connect} from 'puppeteer-core';
import {cmd} from 'web-ext';
import {WebSocketServer} from 'ws';
import {generateHTMLCoverageReports} from './coverage.js';
import {getChromePath, getFirefoxPath, chromeExtensionDebugDir, chromeMV3ExtensionDebugDir, firefoxExtensionDebugDir} from './paths.js';
import {createTestServer, generateRandomId} from './server.js';

const TEST_SERVER_PORT = 8891;
const CORS_SERVER_PORT = 8892;
const FIREFOX_DEVTOOLS_PORT = 8893;
const POPUP_TEST_PORT = 8894;

export default class CustomJestEnvironment extends TestEnvironment {
    /** @type {() => void} */
    extensionStartListeners = [];
    pageEventListeners = new Map();

    /** @type {Browser} */
    broser;
    /** @type {WebSocketServer} */
    messageServer;

    async setup() {
        await super.setup();

        const promises1 = [
            this.createMessageServer(),
            this.launchBrowser(),
        ];
        const promises2 = [
            createTestServer(TEST_SERVER_PORT),
            createTestServer(CORS_SERVER_PORT),
        ];

        const results1 = await Promise.all(promises1);
        this.messageServer = results1[0];
        this.browser = results1[1];

        promises2.push(
            this.createTestPage(),
        );

        const results2 = await Promise.all(promises2);
        this.testServer = results2[0];
        this.corsServer = results2[1];
        this.page = results2[2];

        // Wait for tabs to load?

        this.assignTestGlobals();
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForStartup() {
        if (!this.extensionOrigin) {
            return new Promise((ready) => this.extensionStartListeners.push(ready));
        }
    }

    /**
     * @returns {Promise<Browser>}
     */
    async launchBrowser() {
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

    /**
     * @returns {Promise<Browser>}
     */
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
        return await launch({
            executablePath,
            headless: false,
            args: [
                `--disable-extensions-except=${extensionDir}`,
                `--load-extension=${extensionDir}`,
                '--show-component-extension-options',
            ],
        });
    }

    /**
     * @returns {Promise<Browser>}
     */
    async launchFirefoxPuppeteer() {
        const retries = 100;
        const retryIntervalInMs = 100;
        for (let i = 0; i < retries; i++) {
            try {
                return await connect({
                    browserURL: `http://localhost:${FIREFOX_DEVTOOLS_PORT}`,
                });
            } catch (e) {
                await new Promise((resolve) => setTimeout(resolve, retryIntervalInMs));
            }
        }
        throw new Error('Failed to connect to Puppeteer');
    }

    /**
     * @returns {Promise<Browser>}
     */
    async launchFirefox() {
        // We need to manually launch Firefox via cmd.run() to install extension
        // because Firefox does not support installing via CLI arguments
        const firefox = await getFirefoxPath();
        await cmd.run({
            sourceDir: firefoxExtensionDebugDir,
            firefox,
            noReload: true,
            args: ['--remote-debugging-port', FIREFOX_DEVTOOLS_PORT],
        }, {
            shouldExitProgram: false,
        });
        return await this.launchFirefoxPuppeteer();
    }

    async createTestPage() {
        if (this.global.product === 'firefox') {
            return;
        }
        const page = await this.browser.newPage();
        page.on('pageerror', (err) => process.emit('uncaughtException', err));
        await page.coverage.startJSCoverage();
        return page;
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

    /**
     * @param {Page} page
     * @param {string} url
     * @param {WaitForOptions} gotoOptions
     * @returns Promise which resolves when page loads
     */
    async pageGoto(url, gotoOptions) {
        // Normalize URL
        const pathname = new URL(url).pathname;
        // Depending on external circumstances, page may connect to server before page.goto() reolves
        const promise = this.awaitForEvent(`ready-${pathname}`);
        // Firefox does not resolve promise returned by page.goto()
        // Doesn't resolve due to https://github.com/puppeteer/puppeteer/issues/6616
        if (this.global.product !== 'firefox') {
            await this.page.goto(url, gotoOptions);
        } else {
            await this.global.backgroundUtils.createTab(url);
        }
        await promise;
    }

    async openTestPage(url, gotoOptions) {
        if (this.global.product !== 'firefox') {
            await this.page.bringToFront();
        }
        await this.pageGoto(url, gotoOptions);
    }

    onPageEventResponse(eventUUID) {
        const resolves = this.pageEventListeners.get(eventUUID);
        this.pageEventListeners.delete(eventUUID);
        resolves && resolves.forEach((r) => r());
    }

    assignTestGlobals() {
        this.global.getColorScheme = async () => {
            if (this.global.product === 'firefox') {
                throw new Error('Firefox does not support page.evaluate()');
            }
            const isDark = await this.page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
            return isDark ? 'dark' : 'light';
        };

        this.global.evaluateScript = async (script) => {
            if (this.global.product === 'firefox') {
                if (typeof script !== 'function') {
                    throw new Error('Not implemented');
                }
                return await this.global.pageUtils.evaluate(`(${script.toString()})()`);
            }
            return await this.page.evaluate(script);
        };

        this.global.expectPageStyles = async (expect, expectations) => {
            if (this.global.product === 'firefox') {
                const errors = await this.global.pageUtils.expectPageStyles(expectations);
                expect(errors.length).toBe(0);
                return;
            }
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
            await this.openTestPage(`http://localhost:${TEST_SERVER_PORT}`, gotoOptions);
        };

        this.global.corsURL = this.corsServer.url;
    }

    /**
     * Creates a server and returns once extension connects to it
     * @returns {Promise<WebSocketServer>} server
     */
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
                        resolve(wsServer);
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
                            // Filter out non-top frames
                            // this is to simplify expectPageStyle implementation
                            if (message.data.uuid === 'ready-/') {
                                pageSockets.add(ws);
                            }
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

            function sendToPage(type, data) {
                return sendToContext(Array.from(pageSockets), type, data);
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
                createTab: async (url) => await sendToBackground('createTab', url),
            };

            this.global.pageUtils = {
                evaluate: async (script) => await sendToPage('firefox-eval', script),
                expectPageStyles: async (expectations) => await sendToPage('firefox-expectPageStyles', expectations),
            };

            this.global.awaitForEvent = awaitForEvent;
        });
    }

    /**
     * @returns {Promise<void>}
     */
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
