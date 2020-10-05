// @ts-check
const JestNodeEnvironment = require('jest-environment-node');
const puppeteer = require('puppeteer-core');
const {generateHTMLCoverageReport} = require('./coverage');
const {getChromePath, chromeExtensionDebugDir} = require('./paths');
const server = require('./server');

const TEST_SERVER_PORT = 8891;

class PuppeteerEnvironment extends JestNodeEnvironment {
    async setup() {
        await super.setup();

        const chromePath = await getChromePath();
        const browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: false,
            args: [
                `--disable-extensions-except=${chromeExtensionDebugDir}`,
                `--load-extension=${chromeExtensionDebugDir}`,
                '--show-component-extension-options',
            ],
        });
        this.browser = browser;
        this.global.browser = browser;

        await server.start(TEST_SERVER_PORT);

        const page = (await browser.pages())[0];
        page.setCacheEnabled(false);
        page.on('pageerror', (err) => process.emit('uncaughtException', err));
        await page.coverage.startJSCoverage();
        this.page = page;
        this.global.page = page;

        const loadTestPage = async (paths) => {
            server.setPaths(paths);
            await this.page.bringToFront();
            await this.page.goto(`http://localhost:${TEST_SERVER_PORT}`);
        };
        this.global.loadTestPage = loadTestPage;
    }

    async teardown() {
        await super.teardown();

        const coverage = await this.page.coverage.stopJSCoverage();
        coverage
            .filter(({url}) => url.startsWith('chrome-extension://'))
            .forEach((c) => generateHTMLCoverageReport(
                './tests/browser/reports/',
                c.url.replace(/^chrome-extension:\/\/.*?\//, ''),
                c.text,
                c.ranges,
            ));

        this.browser.close();
        await server.close();
    }
}

module.exports = PuppeteerEnvironment;
