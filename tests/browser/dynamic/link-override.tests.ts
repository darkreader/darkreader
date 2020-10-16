import {multiline} from '../utils';

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
                '<html>',
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
});
