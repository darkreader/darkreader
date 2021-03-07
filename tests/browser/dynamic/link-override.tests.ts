import {multiline, timeout} from '../../test-utils';

describe('Link override', () => {
    it('should override link style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <link rel="stylesheet" href="style.css"/>',
                '</head>',
                '<body>',
                '    <h1>Link style <strong>override</strong>!</h1>',
                '</body>',
                '</html>',
            ),
            '/style.css': multiline(
                'body { background: gray; }',
                'h1 strong { color: red; }',
            ),
        });

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(96, 104, 108)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 26, 26)');
    });

    it('should override CORS style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                `    <link rel="stylesheet" href="${corsURL}/style.css"/>`,
                '</head>',
                '<body>',
                '    <h1>CORS style <strong>override</strong>!</h1>',
                '</body>',
                '</html>',
            ),
            cors: {
                '/style.css': multiline(
                    'body { background: gray; }',
                    'h1 strong { color: red; }',
                ),
            },
        });

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(96, 104, 108)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 26, 26)');
    });

    it('should wait till style is loading', async () => {
        let proceedCSSResponse: () => void;

        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <link rel="stylesheet" href="style.css"/>',
                '</head>',
                '<body>',
                '    <h1>Link loading <strong>delay</strong></h1>',
                '</body>',
                '</html>',
            ),
            '/style.css': async (_, res) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/css');

                await new Promise<void>((resolve) => proceedCSSResponse = resolve);

                res.end(multiline(
                    'body { background: gray; }',
                    'h1 strong { color: red; }',
                ), 'utf8');
            },
        }, {
            waitUntil: 'domcontentloaded',
        });

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(232, 230, 227)');

        proceedCSSResponse();
        await timeout(500);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(96, 104, 108)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 26, 26)');
    });
});
