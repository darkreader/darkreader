import {multiline, timeout} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

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

describe('Toggling the extension', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

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

        const automationMenuSelector = '.header__more-settings-button';
        const automationSystemSelector = '.header__more-settings__system-dark-mode__checkbox .checkbox__input';

        await emulateColorScheme('light');
        await expect(getColorScheme()).resolves.toBe('light');

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
        await expect(getColorScheme()).resolves.toBe('dark');

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);

        await emulateColorScheme('light');
        await expect(getColorScheme()).resolves.toBe('light');

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

    it('should have new design button on desktop', async () => {
        expect(await devtoolsUtils.exists('.preview-design-button'));
    });
});
