import {TestEnvironment} from 'jest-environment-node';
import {WebSocketServer} from 'ws';

import {generateHTMLCoverageReports} from './coverage.js';
import {collectBrowserDiagnostics} from './diagnostics.js';
import {
    CORS_SERVER_PORT,
    POPUP_TEST_PORT,
    TEST_SERVER_PORT,
} from './ports.js';
import {acquireBrowser} from './shared-browser.js';
import {createTestServer, generateRandomId} from './server.js';
const DEFAULT_TIMEOUT_MS = Number(process.env.BROWSER_TEST_TIMEOUT_MS) || 120_000;
const SETUP_TIMEOUT_MS = Number(process.env.BROWSER_TEST_SETUP_TIMEOUT_MS) || 45_000;

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} label
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`${label} (timed out after ${ms}ms)`));
        }, ms);
        Promise.resolve(promise).then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

export default class CustomJestEnvironment extends TestEnvironment {
    /** @type {() => void} */
    extensionStartListeners = [];
    pageEventListeners = new Map();

    /** @type {Browser} */
    browser;
    /** @type {boolean} */
    browserOwned = false;
    /** @type {WebSocketServer} */
    messageServer;

    async setup() {
        await super.setup();

        try {
            const [testServer, corsServer] = await Promise.all([
                createTestServer(TEST_SERVER_PORT),
                createTestServer(CORS_SERVER_PORT, {cors: true}),
            ]);
            this.testServer = testServer;
            this.corsServer = corsServer;

            // Listen before launching the browser so the extension never connects
            // while the WebSocket server is still starting.
            this.messageServer = await this.startMessageServer();

            const {browser, owned} = await acquireBrowser(this.global.product);
            this.browser = browser;
            this.browserOwned = owned;

            await withTimeout(
                this.waitForStartup(),
                SETUP_TIMEOUT_MS,
                `Extension did not connect to ws://localhost:${POPUP_TEST_PORT} during setup`,
            );

            await withTimeout(
                this.waitForHarnessUIPages(),
                SETUP_TIMEOUT_MS,
                'Popup and DevTools pages did not connect to test harness',
            );

            this.page = await this.createTestPage();
            this.assignTestGlobals(this.global, this.testServer, this.corsServer, this.page);
        } catch (error) {
            const diagnostics = await collectBrowserDiagnostics(this.browser);
            await this.forceCleanup();
            const details = error instanceof Error ? error : new Error(String(error));
            details.message += `\n\nBrowser diagnostics:\n${diagnostics}`;
            throw details;
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForHarnessUIPages() {
        return new Promise((resolve) => {
            const tick = () => {
                if (this.harnessUIState?.hasPopup() && this.harnessUIState?.hasDevTools()) {
                    resolve();
                    return;
                }
                setTimeout(tick, 25);
            };
            tick();
        });
    }

    async resetHarnessExtensionState() {
        if (!this.harnessMessaging?.sendToBackground) {
            return;
        }
        await this.harnessMessaging.sendToBackground('changeSettings', {enabled: true});
    }

    async waitForStartup() {
        if (this.extensionOrigin) {
            return;
        }
        const hint = `Extension did not connect to ws://localhost:${POPUP_TEST_PORT}. `
            + 'Ensure the debug test build exists (npm run test:chrome-mv3 runs it), '
            + `port ${POPUP_TEST_PORT} is free, and Chrome/Firefox can load the extension.`;
        return withTimeout(
            new Promise((ready) => this.extensionStartListeners.push(ready)),
            DEFAULT_TIMEOUT_MS,
            hint,
        );
    }

    async createTestPage() {
        const page = await this.browser.newPage();
        this.pageErrors = [];
        page.on('pageerror', (err) => {
            this.pageErrors.push(err instanceof Error ? err.message : String(err));
        });
        if (this.global.product !== 'firefox') {
            await page.coverage.startJSCoverage();
        }
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
        return withTimeout(
            new Promise((resolve) => {
                if (this.pageEventListeners.has(uuid)) {
                    this.pageEventListeners.get(uuid).push(resolve);
                } else {
                    this.pageEventListeners.set(uuid, [resolve]);
                }
            }),
            DEFAULT_TIMEOUT_MS,
            `Timed out waiting for browser test event "${uuid}"`,
        );
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
        await this.page.goto(url, gotoOptions);
        await promise;
    }

    async openTestPage(url, gotoOptions) {
        await this.page.bringToFront();
        await this.pageGoto(url, gotoOptions);
    }

    onPageEventResponse(eventUUID) {
        const resolves = this.pageEventListeners.get(eventUUID);
        this.pageEventListeners.delete(eventUUID);
        resolves && resolves.forEach((r) => r());
    }

    /**
     * This function is evaluated within browser's page context
     * after being passed to page.evaluate()
     * It can use methods which will be defined in the page context,
     * but can not use variables defined in this file besides those passed into it.
     */
    async checkPageStylesInBrowserContext(expectations) {
        const checkOne = (expectation) => {
            const [selector, cssAttributeName, expectedValue] = expectation;
            const selector_ = Array.isArray(selector) ? selector : [selector];
            let element = document;
            for (const part of selector_) {
                if (element instanceof HTMLIFrameElement) {
                    element = element.contentDocument;
                }
                if (element.shadowRoot instanceof ShadowRoot) {
                    element = element.shadowRoot;
                }
                if (part === 'document') {
                    element = element.documentElement;
                } else {
                    element = element.querySelector(part);
                }
                if (!element) {
                    return `Could not find element ${part}`;
                }
            }
            const style = getComputedStyle(element);
            if (style[cssAttributeName] !== expectedValue) {
                return `Expected ${selector_.join(' ')} '${cssAttributeName}' to be '${expectedValue}', but got '${style[cssAttributeName]}'`;
            }
        };

        const checkAll = () => {
            /** @type{Array<[number, string]>} */
            const errors = [];
            for (let i = 0; i < expectations.length; i++) {
                const error = checkOne(expectations[i]);
                if (error) {
                    errors.push(error);
                }
            }
            return errors;
        };

        let timeout = 50;
        let errors = checkAll();
        for (let i = 0; (errors.length !== 0) && (i < 15); i++) {
            timeout *= 2;
            await new Promise((r) => requestIdleCallback(r, {timeout}));
            errors = checkAll();
        }
        return errors;
    }

    assignTestGlobals(global, testServer, corsServer, page) {
        global.getColorScheme = async () => {
            if (global.product === 'firefox') {
                return await global.backgroundUtils.getColorScheme();
            }
            const isDark = await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches);
            return isDark ? 'dark' : 'light';
        };

        global.pageUtils.evaluateScript = async (script) => await page.evaluate(script);

        global.expectPageStyles = async (expect, expectations) => {
            if (!Array.isArray(expectations[0])) {
                expectations = [expectations];
            }
            const errors = await page.evaluate(this.checkPageStylesInBrowserContext, expectations);
            expect(errors.join('\n')).toBe('');
        };

        global.emulateColorScheme = async (colorScheme) => {
            if (global.product === 'firefox') {
                await global.pageUtils.emulateColorScheme(colorScheme);
                await global.backgroundUtils.emulateColorScheme(colorScheme);
                const newPageColorScheme = await global.backgroundUtils.getColorScheme();
                const newBGColorScheme = await global.pageUtils.getColorScheme();
                if (newPageColorScheme !== colorScheme || newBGColorScheme !== colorScheme) {
                    throw new Error('Failed to apply new color scheme');
                }
                return;
            }
            await page.emulateMediaFeatures([{name: 'prefers-color-scheme', value: colorScheme}]);
        };

        global.loadTestPage = async (paths, gotoOptions) => {
            const {cors, ...testPaths} = paths;
            testServer.setPaths(testPaths);
            cors && corsServer.setPaths(cors);
            await this.openTestPage(testServer.url, gotoOptions);
        };

        global.corsURL = corsServer.url;
        global.testServerHost = `localhost:${testServer.port}`;
    }

    /**
     * Starts the WebSocket server used to talk to the extension.
     * @returns {Promise<WebSocketServer>} server
     */
    async startMessageServer() {
        const awaitForEvent = this.awaitForEvent.bind(this);

        return new Promise((resolve, reject) => {
            const wsServer = new WebSocketServer({port: POPUP_TEST_PORT});
            wsServer.on('listening', () => resolve(wsServer));
            wsServer.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error(
                        `WebSocket port ${POPUP_TEST_PORT} is already in use `
                        + '(often a stale browser test). '
                        + `Free it with: lsof -ti:${POPUP_TEST_PORT} | xargs kill -9`,
                    ));
                    return;
                }
                reject(error);
            });
            let backgroundSocket = null;
            let devToolsSocket = null;
            const popupSockets = new Set();
            const pageSockets = new Set();
            const resolvers = new Map();
            const rejectors = new Map();

            let onDownloadCallback = null;

            this.harnessUIState = {
                hasPopup: () => popupSockets.size > 0,
                hasDevTools: () => devToolsSocket !== null,
            };

            wsServer.on('connection', async (ws) => {
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.id === null && message.data && message.data.type === 'background' && message.data.extensionOrigin) {
                        // This is the initial message which contains extension's URL origin
                        // and signals that extenstion is ready
                        this.extensionOrigin = message.data.extensionOrigin;
                        this.extensionStartListeners.forEach((ready) => ready());
                        this.extensionStartListeners = [];
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
                        if (message.data.message === 'page-ready' && message.data.uuid === 'ready-/') {
                            ws.on('close', () => pageSockets.delete(ws));
                            pageSockets.add(ws);
                        }
                        this.onPageEventResponse(message.data.uuid);
                    } else if (message.id === null && message.data && message.data.type === 'download') {
                        if (onDownloadCallback) {
                            onDownloadCallback(message.data);
                        }
                    } else if (message.error) {
                        const reject = rejectors.get(message.id);
                        reject(message.error);
                    } else {
                        const resolveMessage = resolvers.get(message.id);
                        resolveMessage(message.data);
                    }
                    resolvers.delete(message.id);
                    rejectors.delete(message.id);
                });
            });

            function sendToContext(sockets, type, data) {
                return new Promise((resolveMessage, reject) => {
                    const id = generateRandomId();
                    resolvers.set(id, resolveMessage);
                    rejectors.set(id, reject);
                    const json = JSON.stringify({type, data, id});
                    for (const socket of sockets) {
                        socket.send(json);
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
                await Promise.all([
                    sendToDevTools(type, fixes),
                    promise,
                ]);
            }

            this.global.popupUtils = {
                saveFile: async (name, content) => sendToPopup('popup-saveFile', {name, content}),
                click: async (selector) => await sendToPopup('popup-click', selector),
                exists: async (selector) => await sendToPopup('popup-exists', selector),
            };

            this.global.devtoolsUtils = {
                click: async (selector) => await sendToDevTools('devtools-click', selector),
                exists: async (selector) => await sendToDevTools('devtools-exists', selector),
                paste: async (fixes) => await applyDevtoolsConfig('devtools-paste', fixes),
                reset: async () => await applyDevtoolsConfig('devtools-reset'),
            };

            this.global.backgroundUtils = {
                changeSettings: async (settings) => await sendToBackground('changeSettings', settings),
                collectData: async () => await sendToBackground('collectData'),
                changeChromeStorage: async (region, data) => await sendToBackground('changeChromeStorage', {region, data}),
                getChromeStorage: async (region, keys) => await sendToBackground('getChromeStorage', {region, keys}),
                getManifest: async () => await sendToBackground('getManifest'),
                getColorScheme: async () => {
                    return await sendToBackground('firefox-getColorScheme');
                },
                emulateColorScheme: async (colorScheme) => {
                    await sendToBackground('firefox-emulateColorScheme', colorScheme);
                },
                setNews: async (news) => await sendToBackground('setNews', news),
                onDownload: (callback) => onDownloadCallback = callback,
            };

            this.global.pageUtils = {
                emulateColorScheme: async (colorScheme) => await sendToPage('firefox-emulateColorScheme', colorScheme),
                getColorScheme: async () => {
                    return await sendToPage('firefox-getColorScheme');
                },
            };

            this.global.awaitForEvent = awaitForEvent;

            this.harnessMessaging = {
                sendToBackground,
                sendToDevTools,
            };
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async forceCleanup() {
        await this.resetHarnessExtensionState();
        const promises = [];
        if (this.global.product !== 'firefox' && this.page?.coverage) {
            try {
                const coverage = await this.page.coverage.stopJSCoverage();
                const dir = './tests/browser/coverage/';
                const promise = generateHTMLCoverageReports(dir, coverage);
                promise.then(() => console.info('Coverage reports generated in', dir));
                promises.push(promise);
            } catch (e) {
                // Coverage may not have started if setup failed early.
            }
        }
        if (this.messageServer) {
            const server = this.messageServer;
            this.messageServer = null;
            for (const client of server.clients) {
                client.terminate();
            }
            promises.push(new Promise((resolve) => server.close(() => resolve())));
        }
        if (this.testServer) {
            const server = this.testServer;
            this.testServer = null;
            promises.push(server.close());
        }
        if (this.corsServer) {
            const server = this.corsServer;
            this.corsServer = null;
            promises.push(server.close());
        }
        if (this.browser && this.browserOwned) {
            const browser = this.browser;
            this.browser = null;
            promises.push(browser.close().catch(() => {}));
        } else {
            this.browser = null;
        }
        this.page = null;
        this.extensionOrigin = undefined;
        this.extensionStartListeners = [];
        await Promise.allSettled(promises);
    }

    /**
     * @returns {Promise<void>}
     */
    async teardown() {
        await super.teardown();
        await this.forceCleanup();
    }
}
