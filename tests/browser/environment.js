// @ts-check
const fs = require('fs-extra');
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

        this.page = await this.createTestPage();
        this.global.page = this.page;

        this.assignTestGlobals();
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
        const executablePath = await getChromePath();
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

    async openPopupPage() {
        let extensionPopup;
        if (this.global.product === 'chrome') {
            extensionPopup = await this.openChromePopupPage();
        } else if (this.global.product === 'firefox') {
            extensionPopup = await this.openFirefoxPopupPage();
        }
        return extensionPopup;
    }

    async openChromePopupPage() {
        const targets = await this.browser.targets();
        const backgroundTarget = targets.find((t) => t.type() === 'background_page');
        const backgroundPage = await backgroundTarget.page();

        const popupURL = backgroundPage.url().replace('/background/index.html', '/ui/popup/index.html');
        const extensionPopup = await this.browser.newPage();
        await extensionPopup.goto(popupURL);

        return extensionPopup;
    }

    async openFirefoxPopupPage() {
        const extensionPopup = await this.browser.newPage();
        // Doesn't resolve due to https://github.com/puppeteer/puppeteer/issues/6616
        extensionPopup.goto(`moz-extension://${this.firefoxInternalUUID}/ui/popup/index.html`);
        await new Promise((promise) => setTimeout(promise, 1000));
        return extensionPopup;
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

            wsServer.on('listening', () => resolve(wsServer));

            wsServer.on('connection', async (ws) => {
                sockets.add(ws);
                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'error') {
                        const reject = rejectors.get(message.type);
                        reject(message.data);
                    } else {
                        const resolve = resolvers.get(message.type);
                        resolve(message.data);
                    }
                    resolvers.delete(message.type);
                    rejectors.delete(message.type);
                });
                ws.on('close', () => sockets.delete(ws));
            });

            function sendToPopup(message) {
                return new Promise((resolve, reject) => {
                    const responseType = `${message.type}-response`;
                    resolvers.set(responseType, resolve);
                    rejectors.set(responseType, reject);
                    const json = JSON.stringify(message);
                    sockets.forEach((ws) => ws.send(json));
                });
            }

            this.global.popupUtils = {
                click: async (selector) => await sendToPopup({type: 'click', data: selector}),
                exists: async (selector) => await sendToPopup({type: 'exists', data: selector}),
                getBoundingRect: async (selector) => await sendToPopup({type: 'rect', data: selector}),
            };
        });
    }

    async teardown() {
        await super.teardown();

        if (this.global.product !== 'firefox') {
            const coverage = await this.page.coverage.stopJSCoverage();
            const dir = './tests/browser/coverage/';
            await generateHTMLCoverageReports(dir, coverage);
            console.info('Coverage reports generated in', dir);
        }

        await this.extensionPopup.close();
        await this.page.close();
        await this.browser.close();
        await this.testServer.close();
        await this.corsServer.close();
        await this.popupTestServer.close();
    }
}

module.exports = PuppeteerEnvironment;
