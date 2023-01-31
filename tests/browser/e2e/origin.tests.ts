import {multiline} from '../../support/test-utils';

async function loadBasicPage() {
    await loadTestPage({
        '/': multiline(
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '    <style>',
            '        h1 { color: white; }',
            '    </style>',
            '</head>',
            '<body>',
            '    <h1>White title - should stay</h1>',
            '    <h2>White subtitle - should change</h2>',
            '    <iframe id="red" src="/red.html"></iframe>',
            '    <iframe id="blue" src="/blue.html"></iframe>',
            '</body>',
            '</html>',
        ),
        '/red.html': multiline(
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '    <style>',
            '        h1 { color: red; }',
            '        h2 { color: white; }',
            '    </style>',
            '</head>',
            '<body>',
            '    <h1>Red title - should change</h1>',
            '    <h2>White subtitle - should stay</h2>',
            '</body>',
            '</html>',
        ),
        '/blue.html': multiline(
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '    <style>',
            '        h1 { color: blue; }',
            '        h2 { color: white; }',
            '    </style>',
            '</head>',
            '<body>',
            '    <h1>Blue title - should change</h1>',
            '    <h2>White subtitle - should stay</h2>',
            '</body>',
            '</html>',
        ),
    });
}

describe('Different paths in URL patterns', () => {
    it('Different paths upon initial load', async () => {
        await Promise.all([
            awaitForEvent('ready-/red.html'),
            awaitForEvent('ready-/blue.html'),
            loadBasicPage(),
        ]);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');

        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');

        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement.querySelector('h1')).color)).resolves.toBe('rgb(51, 125, 255)');

        await devtoolsUtils.paste([
            '*',
            '',
            'CSS',
            'body {',
            '    bachground: black',
            '    color: white',
            '}',
            '',
            '============================',
            '',
            'localhost:8891/red',
            '',
            'CSS',
            'body {',
            '    bachground: black',
            '}',
            'h1 {',
            '    color: indigo;',
            '}',
            '',
            '============================',
            '',
            'localhost:8891/blue',
            '',
            'CSS',
            'body {',
            '    bachground: black',
            '}',
            'h1 {',
            '    color: navy;',
            '}',
            '',
            '============================',
            '',
            'nonexistent.com',
            '',
            'CSS',
            'body {',
            '    bachground: purple',
            '}',
            '',
        ].join('\n'));

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h2')).color)).resolves.toBe('rgb(232, 230, 227)');

        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement.querySelector('h1')).color)).resolves.toBe('rgb(75, 0, 130)');

        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement.querySelector('h1')).color)).resolves.toBe('rgb(0, 0, 128)');

        const redPromise = awaitForEvent('darkreader-dynamic-theme-ready-/red.html');
        const bluePromise = awaitForEvent('darkreader-dynamic-theme-ready-/blue.html');
        await devtoolsUtils.reset();

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');

        await redPromise;
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#red') as HTMLIFrameElement).contentDocument.documentElement.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');

        await bluePromise;
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle((document.querySelector('iframe#blue') as HTMLIFrameElement).contentDocument.documentElement.querySelector('h1')).color)).resolves.toBe('rgb(51, 125, 255)');
    });
});
