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
            '</body>',
            '</html>',
        ),
    });
}

async function resetChanges() {
    await devtoolsUtils.reset();
    await timeout(1000);
}

describe('Correct fixes are chosen', () => {
    jest.setTimeout(10000);

    it('If no matching URL found, returns only default fix', async () => {
        await loadBasicPage();

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');

        await devtoolsUtils.paste(multiline(
            '*',
            '',
            'CSS',
            'body {',
            '    background: navy;',
            '    color: white;',
            '}',
            'h1 {',
            '    color: orange;',
            '}',
            '',
            '============================',
            '',
            'nonexistent.com',
            '',
            'CSS',
            'body {',
            '    bachground: green;',
            '}',
            '',
            '============================',
            '',
            'other.net',
            '',
            'CSS',
            'body {',
            '    bachground: blue;',
            '}',
            '',
        ));
        await timeout(1000);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(0, 0, 128)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(255, 255, 255)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 165, 0)');

        await resetChanges();
    });

    it('If multiple matching URL patterns found, select the most specific one', async () => {
        await loadBasicPage();

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');

        await devtoolsUtils.paste(multiline(
            '*',
            '',
            'CSS',
            'body {',
            '    background: navy;',
            '    color: white;',
            '}',
            'h1 {',
            '    color: orange;',
            '}',
            '',
            '============================',
            '',
            'localhost:8891/',
            '',
            'CSS',
            'body {',
            '    bachground: blue;',
            '}',
            '',
            '============================',
            '',
            'localhost:8891',
            '',
            'CSS',
            'body {',
            '    bachground: green;',
            '}',
            '',
        ));
        await timeout(1000);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(0, 0, 128)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(255, 255, 255)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 165, 0)');

        await resetChanges();
    });

    it('BUG COMPATIBILITY: If multiple matching URL patterns found, the most specific fix is determined by the length of first pattern', async () => {
        await loadBasicPage();

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');

        await devtoolsUtils.paste(multiline(
            '*',
            '',
            'CSS',
            'body {',
            '    background: navy;',
            '    color: white;',
            '}',
            'h1 {',
            '    color: orange;',
            '}',
            '',
            '============================',
            '',
            'example.com/loooooooong',
            'localhost:8891',
            '',
            'CSS',
            'body {',
            '    bachground: blue;',
            '}',
            '',
            '============================',
            '',
            'example.com',
            'localhost:8891/',
            '',
            'CSS',
            'body {',
            '    bachground: green;',
            '}',
            '',
        ));
        await timeout(1000);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(0, 0, 128)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(255, 255, 255)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 165, 0)');

        await resetChanges();
    });

    it('BUG COMPATIBILITY: If multiple matching URL patterns of the same length are found, select the first one', async () => {
        await loadBasicPage();

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');

        await devtoolsUtils.paste(multiline(
            '*',
            '',
            'CSS',
            'body {',
            '    background: navy;',
            '    color: white;',
            '}',
            'h1 {',
            '    color: orange;',
            '}',
            '',
            '============================',
            '',
            'localhost:8891',
            '',
            'CSS',
            'body {',
            '    bachground: blue;',
            '}',
            '',
            '============================',
            '',
            'localhost:8891',
            '',
            'CSS',
            'body {',
            '    bachground: green;',
            '}',
            '',
        ));
        await timeout(1000);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(0, 0, 128)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(255, 255, 255)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 165, 0)');

        await resetChanges();
    });
});
