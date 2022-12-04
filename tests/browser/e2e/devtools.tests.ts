import {multiline, timeout} from '../../support/test-utils';

async function loadBasicPage() {
    await loadTestPage({
        '/': multiline(
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '    <style>',
            '        h1 { color: red; }',
            '    </style>',
            '</head>',
            '<body>',
            '    <h1>E2E test page</h1>',
            '    <p>Text</p>',
            '    <a href="#">Link</a>',
            '</body>',
            '</html>',
        ),
    });
}

describe('Modifying config via Developer tools', () => {
    it('Modifying config', async () => {
        await loadBasicPage();

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');

        await devtoolsUtils.paste([
            '*',
            '',
            'CSS',
            'bachground: black',
            'color: white',
            '',
            '============================',
            '',
            'nonexistent.com',
            '',
            'CSS',
            'color: red',
            ''
        ].join('\n'));
        await timeout(1000);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');

        await devtoolsUtils.reset();
        await timeout(1000);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');
    });
});
