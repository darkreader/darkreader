import {multiline, timeout} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

async function loadBasicPage(header: string) {
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

describe('Toggling the extension', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    const automationMenuSelector = '.header__more-settings-button';
    const automationSystemSelector = '.header__more-settings__system-dark-mode__checkbox .checkbox__input';

    it('should turn On/Off', async () => {
        await loadBasicPage('Toggle on/off');

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);

        await popupUtils.click('.toggle__off');
        await timeout(500);

        await expectStyles([
            ['document', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['document', 'color', 'rgb(0, 0, 0)'],
            ['body', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['body', 'color', 'rgb(0, 0, 0)'],
            ['h1', 'color', 'rgb(255, 0, 0)'],
            ['a', 'color', 'rgb(0, 0, 238)'],
        ]);

        await popupUtils.click('.toggle__on');
        await timeout(500);

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);
    });

    it('should follow system color scheme', async () => {
        await loadBasicPage('Automation (color scheme)');


        await emulateColorScheme('light');

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);

        await popupUtils.click(automationMenuSelector);
        await popupUtils.click(automationSystemSelector);

        await expectStyles([
            ['document', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['document', 'color', 'rgb(0, 0, 0)'],
            ['body', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['body', 'color', 'rgb(0, 0, 0)'],
            ['h1', 'color', 'rgb(255, 0, 0)'],
            ['a', 'color', 'rgb(0, 0, 238)'],
        ]);

        await emulateColorScheme('dark');

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);

        await emulateColorScheme('light');

        await expectStyles([
            ['document', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['document', 'color', 'rgb(0, 0, 0)'],
            ['body', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['body', 'color', 'rgb(0, 0, 0)'],
            ['h1', 'color', 'rgb(255, 0, 0)'],
            ['a', 'color', 'rgb(0, 0, 238)'],
        ]);

        await popupUtils.click(automationSystemSelector);

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);

        await emulateColorScheme('dark');
    });

    // Note: this test is relevant only to Firefox and Thunderbird
    it('should ignore color watcher messages from subframes', async () => {
        const darkPageExpectations: StyleExpectations = [
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ];

        const lightPageExpectations: StyleExpectations = [
            ['document', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['document', 'color', 'rgb(0, 0, 0)'],
            ['body', 'background-color', 'rgba(0, 0, 0, 0)'],
            ['body', 'color', 'rgb(0, 0, 0)'],
            ['h1', 'color', 'rgb(255, 0, 0)'],
            ['a', 'color', 'rgb(0, 0, 238)'],
        ];

        const darkSubframePageExpectations: StyleExpectations = [
            [['iframe', 'h1'], 'color', 'rgb(255, 26, 26)'],
            [['iframe', 'a'], 'color', 'rgb(51, 145, 255)'],
        ];

        const lightSubframePageExpectations: StyleExpectations = [
            [['iframe', 'h1'], 'color', 'rgb(255, 0, 0)'],
            [['iframe', 'a'], 'color', 'rgb(0, 0, 238)'],
        ];

        let loadSubframe: () => void = null;
        const loadCompleted = loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <style>',
                '        h1 { color: red; }',
                '    </style>',
                '</head>',
                '<body>',
                `    <h1>Color scheme detector</h1>`,
                '    <p>Text</p>',
                '    <a href="#">Link</a>',
                '    <iframe src="/subframe.html" style="color-scheme: light"></iframe>',
                '</body>',
                '</html>',
            ),
            '/subframe.html': async (_, res) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');

                await new Promise<void>((resolve) => loadSubframe = resolve);

                res.end(
                    multiline(
                        '<!DOCTYPE html>',
                        '<html>',
                        '<head>',
                        '    <style>',
                        '        h1 { color: red; }',
                        '    </style>',
                        '</head>',
                        '<body>',
                        '    <h1>Header</h1>',
                        '    <p>Text</p>',
                        '    <a href="#">Link</a>',
                        '</body>',
                        '</html>',
                    ),
                    'utf8'
                );
            },
        }, {
            waitUntil: 'domcontentloaded',
        });

        await awaitForEvent('ready-/');

        await emulateColorScheme('dark');
        await expectStyles(darkPageExpectations);

        await popupUtils.click(automationMenuSelector);
        await popupUtils.click(automationSystemSelector);

        await expectStyles(darkPageExpectations);

        // Finalize page load
        loadSubframe();
        // Top-level page may finish loading only after the subframe has loaded
        await loadCompleted;

        // Ensure that the subframe received its styles
        await expectStyles(darkSubframePageExpectations);
        // Ensure that the parent frame retained its styles
        await expectStyles(darkPageExpectations);

        await emulateColorScheme('light');

        await expectStyles(lightPageExpectations);
        await expectStyles(lightSubframePageExpectations);

        await popupUtils.click(automationSystemSelector);

        await expectStyles(darkPageExpectations);

        await emulateColorScheme('dark');
    });

    it('should have new design button on desktop', async () => {
        await devtoolsUtils.click('.settings-tab-panel__button:nth-child(4)');
        expect(await devtoolsUtils.exists('.preview-design-button'));
    });

    it('dynamic themes', async () => {
        await loadBasicPage('Dynamic styles');

        const numStyles = await pageUtils.evaluateScript(() => document.styleSheets.length);
        expect(numStyles).toBe(product === 'firefox' ? 10 : 1);
    });
});
