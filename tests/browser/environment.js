// @ts-check
const JestNodeEnvironment = require('jest-environment-node');
const puppeteer = require('puppeteer-core');
const {generateHTMLCoverageReports} = require('./coverage');
const {getChromePath, getFirefoxPath, chromeExtensionDebugDir, firefoxExtensionDebugDir} = require('./paths');
const {createTestServer} = require('./server');
const webExt = require('web-ext');

const TEST_SERVER_PORT = 8891;
const CORS_SERVER_PORT = 8892;
const FIREFOX_DEVTOOLS_PORT = 8893;

class PuppeteerEnvironment extends JestNodeEnvironment {
    async setup() {
        await super.setup();

        /** @type {import('puppeteer-core').Browser} */
        let browser;
        if (this.global.product === 'chrome') {
            const executablePath = await getChromePath();
            browser = await puppeteer.launch({
                executablePath,
                headless: false,
                args: [
                    `--disable-extensions-except=${chromeExtensionDebugDir}`,
                    `--load-extension=${chromeExtensionDebugDir}`,
                    '--show-component-extension-options',
                ],
            });
        } else if (this.global.product === 'firefox') {
            const firefoxPath = await getFirefoxPath();
            try {
                await webExt.cmd.run({
                    sourceDir: firefoxExtensionDebugDir,
                    firefox: firefoxPath,
                    args: ['--remote-debugging-port', FIREFOX_DEVTOOLS_PORT],
                }, {
                    shouldExitProgram: false,
                });
                await new Promise((resolve) => setTimeout(resolve, 6000));
                browser = await puppeteer.connect({
                    browserURL: `http://localhost:${FIREFOX_DEVTOOLS_PORT}`,
                });
            } catch (err) {
                console.error(err);
                process.exit(13);
            }
        }
        this.browser = browser;
        this.global.browser = browser;

        this.testServer = await createTestServer(TEST_SERVER_PORT);
        this.corsServer = await createTestServer(CORS_SERVER_PORT);

        const page = await browser.newPage();
        page.setCacheEnabled(false);
        page.on('pageerror', (err) => process.emit('uncaughtException', err));
        if (this.global.product !== 'firefox') {
            await page.coverage.startJSCoverage();
        }
        this.page = page;
        this.global.page = page;

        // TODO: Find a way to wait for the extension to start
        await new Promise((promise) => setTimeout(promise, 1000));

        const loadTestPage = async (paths, gotoOptions) => {
            const {cors, ...testPaths} = paths;
            this.testServer.setPaths(testPaths);
            cors && this.corsServer.setPaths(cors);
            await page.bringToFront();
            await page.goto(`http://localhost:${TEST_SERVER_PORT}`, gotoOptions);
            // TODO: Determine why sometimes tests are executed before content script
            await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 1000)));
        };
        this.global.loadTestPage = loadTestPage;
        this.global.corsURL = this.corsServer.url;
    }

    async teardown() {
        await super.teardown();

        if (this.global.product !== 'firefox') {
            const coverage = await this.page.coverage.stopJSCoverage();
            const dir = './tests/browser/coverage/';
            await generateHTMLCoverageReports(dir, coverage);
            console.info('Coverage reports generated in', dir);
        }

        this.browser.close();
        await this.testServer.close();
        await this.corsServer.close();
    }
}

module.exports = PuppeteerEnvironment;
