import {Browser, Page} from 'puppeteer-core';

const timeout = 5000;
const serverURL = 'http://localhost:8891'

function multiline(...lines) {
    return lines.join('\n');
}

describe('Loading test page', () => {
    const browser: Browser = (global as any).__BROWSER__;
    const server = (global as any).__SERVER__;
    let page: Page;

    const loadTestPage = async (paths) => {
        server.setPaths(paths);
        await page.goto(serverURL);
    };

    beforeAll(async () => {
        page = await browser.newPage();
        await page.coverage.startJSCoverage();
    }, timeout);

    afterAll(async () => {
        const coverage = await page.coverage.stopJSCoverage();
        await page.close();
        console.log('Code coverage', coverage.filter(Boolean)[0]);
    });

    it('should load without errors', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <title>Test page</title>',
                '    <link rel="stylesheet" href="style.css"/>',
                '    <script src="script.js"></script>',
                '</head>',
                '<body>',
                '    <h1>Hello, <strong>World</strong>!</h1>',
                '</body>',
                '<html>',
                '</html>',
            ),
            '/script.js': multiline(
                'if (true || false) {',
                '    console.log("Hi!");',
                '} else {',
                '    console.log("Bye!");',
                '}',
            ),
            '/style.css': multiline(
                'body {',
                '    background-color: gray;',
                '}',
                'h1 strong {',
                '    color: red;',
                '}',
            ),
        });

        expect(page.evaluate(() => document.title)).resolves.toBe('Test page');
        expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(128, 128, 128)');
        expect(page.evaluate(() => document.querySelector('h1').textContent)).resolves.toBe('Hello, World!');
        expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 0, 0)');
    });
},
);
