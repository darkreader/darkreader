import {multiline, timeout} from '../../support/test-utils';

async function loadBasicPage(header = 'E2E test page') {
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
            `    <h1>${header}</h1>`,
            '    <p>Text</p>',
            '    <a href="#">Link</a>',
            '</body>',
            '</html>',
        ),
    });
}

async function emulateMedia(name: string, value: string) {
    await page.emulateMediaFeatures([{name, value}]);
    await backgroundUtils.emulateMedia(name, value);
}

describe('Toggling The Extension', () => {
    it('should turn On/Off', async () => {
        await loadBasicPage('Toggle on/off');

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');

        await popupUtils.click('.toggle__off');
        await timeout(250);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(0, 0, 238)');

        await popupUtils.click('.toggle__on');
        await timeout(250);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');
    });

    it('should follow system color scheme', async () => {
        await loadBasicPage('Automation (color scheme)');

        const automationMenuSelector = '.header__app-toggle__more-button';
        const automationSystemSelector = '.header__app-toggle__more-settings__system-dark-mode__checkbox .checkbox__input';

        await emulateMedia('prefers-color-scheme', 'light');
        await expect(page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).resolves.toBe(false);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');

        await popupUtils.click(automationMenuSelector);
        await timeout(250);
        await popupUtils.click(automationSystemSelector);
        await timeout(250);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(0, 0, 238)');

        await emulateMedia('prefers-color-scheme', 'dark');
        await expect(page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).resolves.toBe(true);
        await timeout(250);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');

        await emulateMedia('prefers-color-scheme', 'light');
        await expect(page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).resolves.toBe(false);
        await timeout(250);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgba(0, 0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(0, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 0, 0)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(0, 0, 238)');

        await popupUtils.click(automationSystemSelector);
        await timeout(250);

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(255, 26, 26)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');

        await emulateMedia('prefers-color-scheme', 'dark');
    });
});
