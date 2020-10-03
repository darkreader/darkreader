import {Browser, Page} from 'puppeteer-core';
import {generateHTMLCoverageReport} from './coverage';

const timeout = 5000;
const serverURL = 'http://localhost:8891'

function multiline(...lines) {
    return lines.join('\n');
}

describe('Loading test page', () => {
    const browser: Browser = (global as any).__BROWSER__;
    const setServerPaths = (global as any).__SET_SERVER_PATHS__;
    let page: Page;

    const loadTestPage = async (paths) => {
        setServerPaths(paths);
        await page.goto(serverURL);
    };

    beforeAll(async () => {
        page = await browser.newPage();
        page.on('pageerror', (err) => process.emit('uncaughtException', err));
        await page.coverage.startJSCoverage();
    }, timeout);

    afterAll(async () => {
        const coverage = await page.coverage.stopJSCoverage();
        await page.close();
        coverage
            .filter(({url}) => url.startsWith('chrome-extension://'))
            .forEach((c) => generateHTMLCoverageReport(
                './tests/browser/reports/',
                c.url.replace(/^chrome-extension:\/\/.*?\//, ''),
                c.text,
                c.ranges,
            ));
    });

    it('should load without errors', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <title>Test page</title>',
                '    <link rel="stylesheet" href="style.css"/>',
                '    <script src="script.js" defer></script>',
                '</head>',
                '<body>',
                '    <h1>Hello, <strong>World</strong>!</h1>',
                '</body>',
                '<html>',
                '</html>',
            ),
            '/script.js': multiline(
                'if (true || false) {',
                '    document.querySelector("h1 strong").style.color = "red";',
                '} else {',
                '    throw new Error("Impossible");',
                '}',
            ),
            '/style.css': multiline(
                'body {',
                '    background-color: gray;',
                '}',
            ),
        });

        await expect(page.evaluate(() => document.title)).resolves.toBe('Test page');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(96, 104, 108)');
        await expect(page.evaluate(() => document.querySelector('h1').textContent)).resolves.toBe('Hello, World!');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 26, 26)');
    });
});
