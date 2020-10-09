// @ts-check
const JestNodeEnvironment = require('jest-environment-node');
const puppeteer = require('puppeteer-core');
const {generateHTMLCoverageReports} = require('./coverage');
const {getChromePath, getFirefoxPath, chromeExtensionDebugDir, firefoxExtensionDebugDir} = require('./paths');
const server = require('./server');
const webExt = require('web-ext');

const TEST_SERVER_PORT = 8891;

class PuppeteerEnvironment extends JestNodeEnvironment {
    async setup() {
        await super.setup();

        /** @type {'chrome' | 'firefox'} */
        const product = 'chrome';
        this.product = product;

        /** @type {import('puppeteer-core').Browser} */
        let browser;
        if (product === 'chrome') {
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
        } else if (product === 'firefox') {
            const firefoxPath = await getFirefoxPath();
            try {
                const runner = await webExt.cmd.run({
                    sourceDir: firefoxExtensionDebugDir,
                    firefox: firefoxPath,
                }, {
                    shouldExitProgram: false,
                });
                const {debuggerPort} = runner.extensionRunners[0].runningInfo;
                browser = await puppeteer.connect({
                    browserWSEndpoint: `ws://localhost:${debuggerPort}`,
                });
            } catch (err) {
                console.error(err);
                process.exit(13);
            }
        }
        this.browser = browser;
        this.global.browser = browser;

        await server.start(TEST_SERVER_PORT);

        const page = (await browser.pages())[0];
        page.setCacheEnabled(false);
        page.on('pageerror', (err) => process.emit('uncaughtException', err));
        if (product !== 'firefox') {
            await page.coverage.startJSCoverage();

        }
        this.page = page;
        this.global.page = page;

        const loadTestPage = async (paths) => {
            server.setPaths(paths);
            await page.bringToFront();
            await page.goto(`http://localhost:${TEST_SERVER_PORT}`);
            // TODO: Determine why sometimes tests are executed before content script
            await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
        };
        this.global.loadTestPage = loadTestPage;
    }

    async teardown() {
        await super.teardown();

        if (this.product !== 'firefox') {
            const coverage = await this.page.coverage.stopJSCoverage();
            await generateHTMLCoverageReports('./tests/browser/reports/', coverage);
        }

        this.browser.close();
        await server.close();
    }
}

module.exports = PuppeteerEnvironment;
