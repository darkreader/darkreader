import {multiline} from '../../support/test-utils';

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

describe('Test environment', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('should turn On/Off', async () => {
        await loadBasicPage();

        const initialColorScheme = await getColorScheme();
        const overrideColorScheme = initialColorScheme === 'dark' ? 'light' : 'dark';

        expect(initialColorScheme === 'light' || initialColorScheme === 'dark');
        if (product === 'firefox') {
            await expect(backgroundUtils.getColorScheme()).resolves.toBe(initialColorScheme);
        }

        await emulateColorScheme(overrideColorScheme);
        await expect(getColorScheme()).resolves.toBe(overrideColorScheme);
        if (product === 'firefox') {
            await expect(backgroundUtils.getColorScheme()).resolves.toBe(overrideColorScheme);
        }
    });
});
