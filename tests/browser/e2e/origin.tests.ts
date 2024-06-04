import {multiline} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

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
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('Different paths upon initial load', async () => {
        await Promise.all([
            awaitForEvent('ready-/red.html'),
            awaitForEvent('ready-/blue.html'),
            loadBasicPage(),
        ]);

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],

            [['iframe#red', 'document'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#red', 'document'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#red', 'body'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#red', 'body'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#red', 'h1'], 'color', 'rgb(255, 26, 26)'],

            [['iframe#blue', 'document'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#blue', 'document'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#blue', 'body'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#blue', 'body'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#blue', 'h1'], 'color', 'rgb(51, 125, 255)'],
        ]);

        await devtoolsUtils.paste([
            '*',
            '',
            'CSS',
            'body {',
            '    background: black',
            '    color: white',
            '}',
            '',
            '============================',
            '',
            '*/red.html',
            '',
            'CSS',
            'body {',
            '    background: black',
            '}',
            'h1 {',
            '    color: indigo;',
            '}',
            '',
            '============================',
            '',
            '*/blue.html',
            '',
            'CSS',
            'body {',
            '    background: black',
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
            '    background: purple',
            '}',
            '',
        ].join('\n'));

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],
            ['h2', 'color', 'rgb(232, 230, 227)'],

            [['iframe#red', 'document'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#red', 'document'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#red', 'body'], 'background-color', 'rgb(0, 0, 0)'],
            [['iframe#red', 'body'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#red', 'h1'], 'color', 'rgb(75, 0, 130)'],

            [['iframe#blue', 'document'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#blue', 'document'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#blue', 'body'], 'background-color', 'rgb(0, 0, 0)'],
            [['iframe#blue', 'body'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#blue', 'h1'], 'color', 'rgb(0, 0, 128)'],
        ]);

        const redPromise = awaitForEvent('darkreader-dynamic-theme-ready-/red.html');
        const bluePromise = awaitForEvent('darkreader-dynamic-theme-ready-/blue.html');
        await Promise.all([
            redPromise,
            bluePromise,
            devtoolsUtils.reset(),
        ]);

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],

            [['iframe#red', 'document'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#red', 'document'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#red', 'body'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#red', 'body'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#red', 'h1'], 'color', 'rgb(255, 26, 26)'],

            [['iframe#blue', 'document'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#blue', 'document'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#blue', 'body'], 'background-color', 'rgba(0, 0, 0, 0)'],
            [['iframe#blue', 'body'], 'color', 'rgb(232, 230, 227)'],
            [['iframe#blue', 'h1'], 'color', 'rgb(51, 125, 255)'],
        ]);
    });
});
