const fs = require('fs').promises;
const JestNodeEnvironment = require('jest-environment-node');
const path = require('path');
const puppeteer = require('puppeteer-core');
const webExt = require('web-ext');
const WebSocket = require('ws');
const {generateHTMLCoverageReports} = require('./coverage');
const {getChromePath, getFirefoxPath, chromeExtensionDebugDir, firefoxExtensionDebugDir} = require('./paths');
const {createTestServer} = require('./server');

const TEST_SERVER_PORT = 8891;
const CORS_SERVER_PORT = 8892;
const FIREFOX_DEVTOOLS_PORT = 8893;
const POPUP_TEST_PORT = 8894;

class PuppeteerEnvironment extends JestNodeEnvironment {
    async setup() {
        await super.setup();

        this.popupTestServer = await this.createPopupTestServer();
        this.testServer = await createTestServer(TEST_SERVER_PORT);
        this.corsServer = await createTestServer(CORS_SERVER_PORT);

        this.browser = await this.launchBrowser();
        this.global.browser = this.browser;

        this.extensionPopup = await this.openPopupPage();
        this.extensionDevtools = await this.openDevtoolsPage();

        this.page = await this.createTestPage();
        this.global.page = this.page;

        this.assignTestGlobals();

        // Close sentinel about:blank page created by Puppeteer but not used in tests.
        this.browser.pages().then((pages) => {
            const sentinel = pages[0];
            if (sentinel._target._targetInfo.url === 'about:blank') {
                sentinel.close();
            }
        });
    }

    async launchBrowser() {
        /** @type {import('puppeteer-core').Browser} */
        let browser;
        if (this.global.product === 'chrome') {
            browser = await this.launchChrome();
        } else if (this.global.product === 'firefox') {
            browser = await this.launchFirefox();
        }
        // TODO: Find a way to wait for the extension to start
        await new Promise((promise) => setTimeout(promise, 1000));
        return browser;
    }

    async launchChrome() {
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
                `--disable-extensions-except=${chromeExtensionDebugDir}`,
                `--load-extension=${chromeExtensionDebugDir}`,
                '--show-component-extension-options',
            ],
        });
    }

    async launchFirefox() {
        const firefoxPath = await getFirefoxPath();
        const webExtInstance = await webExt.cmd.run({
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
     * @returns {puppeteer.Page}
     */
    async openExtensionPage(path) {
        if (this.global.product === 'chrome') {
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

    async getBackgroundPage() {
        const targets = await this.browser.targets();
        const backgroundTarget = targets.find((t) => t.type() === 'background_page');
        return await backgroundTarget.page();
    }

    async openChromePage(path) {
        const backgroundPage = await this.getBackgroundPage();
        const pageURL = backgroundPage.url().replace('/background/index.html', path);
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
            const wsServer = new WebSocket.Server({port: POPUP_TEST_PORT});
            const sockets = new Set();
            const resolvers = new Map();
            const rejectors = new Map();
            let idCount = 0;

            wsServer.on('listening', () => resolve(wsServer));

            wsServer.on('connection', async (ws) => {
                sockets.add(ws);
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'error') {
                        const reject = rejectors.get(message.id);
                        reject(message.data);
                    } else {
                        const resolve = resolvers.get(message.id);
                        resolve(message.data);
                    }
                    resolvers.delete(message.id);
                    rejectors.delete(message.id);
                });
                ws.on('close', () => sockets.delete(ws));
            });

            function sendToUIPage(message) {
                return new Promise((resolve, reject) => {
                    resolvers.set(idCount, resolve);
                    rejectors.set(idCount, reject);
                    const json = JSON.stringify({...message, id: idCount});
                    sockets.forEach((ws) => ws.send(json));
                    idCount++;
                });
            }

            this.global.popupUtils = {
                click: async (selector) => await sendToUIPage({type: 'click', data: selector}),
                exists: async (selector) => await sendToUIPage({type: 'exists', data: selector}),
            };

            this.global.devtoolsUtils = {
                paste: async (fixes) => await sendToUIPage({type: 'debug-devtools-paste', data: fixes}),
                reset: async () => await sendToUIPage({type: 'debug-devtools-reset'}),
            };

            this.global.backgroundUtils = {
                changeSettings: async (settings) => await sendToUIPage({type: 'changeSettings', data: settings}),
                collectData: async () => await sendToUIPage({type: 'collectData'}),
                changeLocalStorage: async (data) => await sendToUIPage({type: 'changeLocalStorage', data}),
                getLocalStorage: async () => await sendToUIPage({type: 'getLocalStorage'}),
                changeChromeStorage: async (region, data) => await sendToUIPage({type: 'changeChromeStorage', data: {region, data}}),
                getChromeStorage: async (region, keys) => await sendToUIPage({type: 'getChromeStorage', data: {region, keys}}),
                setDataIsMigratedForTesting: async (value) => await sendToUIPage({type: 'setDataIsMigratedForTesting', data: value}),
                emulateMedia: async (name, value) => {
                    if (this.global.product === 'firefox') {
                        return;
                    }
                    const bg = await this.getBackgroundPage();
                    await bg.emulateMediaFeatures([{name, value}]);
                },
            };
        });
    }

    async teardown() {
        await super.teardown();

        if (this.global.product !== 'firefox' && this.page?.coverage) {
            const coverage = await this.page.coverage.stopJSCoverage();
            const dir = './tests/browser/coverage/';
            await generateHTMLCoverageReports(dir, coverage);
            console.info('Coverage reports generated in', dir);
        }

        await this.extensionPopup?.close();
        await this.extensionDevtools?.close();
        await this.page?.close();
        await this.testServer?.close();
        await this.corsServer?.close();
        await this.popupTestServer?.close();
        await this.browser?.close();
    }
}

module.exports = PuppeteerEnvironment;
