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

/*

        '/subframe.html': multiline(
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '</head>',
            '<body>',
            `    <h1>Subframe color: ${color}</h1>`,
            '</body>',
            '</html>',
        ),
    })
];
}
*/

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

    // Note: this test is relevant only to Firefox and Thunderbird
    // which do not support color schmeme overrides the way we use them
    // Instead, we query the current system color scheme and adjust the test accordingly
    // Test will fail if user changes system color scheme mid-way through the test
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

        let subframeBarrier: () => void = null;
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
                `    <h1>Color scheme detector</h1>`,
                '    <p>Text</p>',
                '    <a href="#">Link</a>',
                '</body>',
                '</html>',
                ),
            '/subframe.html': async (_, res) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html');
    
                await new Promise<void>((resolve) => subframeBarrier = resolve);
    
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
                        '    <h1>header</h1>',
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

        // Note: this call needs to be after loadTestPage() since
        // on Firefox we query color scheme from page context
        const systemColorScheme = await getColorScheme(); // TODO

        const initialPageExpectations = systemColorScheme === 'dark' ? darkPageExpectations : lightPageExpectations;

        const automationMenuSelector = '.header__more-settings-button';
        const automationSystemSelector = '.header__more-settings__system-dark-mode__checkbox .checkbox__input';

        await expect(getColorScheme()).resolves.toBe(systemColorScheme);

        await expectStyles(darkPageExpectations);

        await popupUtils.click(automationMenuSelector);
        await popupUtils.click(automationSystemSelector);

        await expectStyles(initialPageExpectations);

        console.error(123);


        await emulateMedia('prefers-color-scheme', 'dark');
        await expect(getColorScheme()).resolves.toBe('dark');

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);

        await emulateMedia('prefers-color-scheme', 'light');
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

        await emulateMedia('prefers-color-scheme', 'dark');
    });

    it('should have new design button on desktop', async () => {
        expect(await devtoolsUtils.exists('.preview-design-button'));
    });
});
