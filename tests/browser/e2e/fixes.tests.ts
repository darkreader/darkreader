import {multiline} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

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

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

describe('Correct fixes are chosen', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('If no matching URL found, returns only default fix', async () => {
        await loadBasicPage();

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
        ]);

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
        ));

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(0, 0, 128)'],
            ['body', 'color', 'rgb(255, 255, 255)'],
            ['h1', 'color', 'rgb(255, 165, 0)'],
        ]);

        await devtoolsUtils.reset();
    });

    it('If multiple matching URL patterns found, select the most specific one', async () => {
        await loadBasicPage();

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
        ]);

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
        ));

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(0, 0, 128)'],
            ['body', 'color', 'rgb(255, 255, 255)'],
            ['h1', 'color', 'rgb(255, 165, 0)'],
        ]);

        await devtoolsUtils.reset();
    });

    it('BUG COMPATIBILITY: If multiple matching URL patterns found, the most specific fix is determined by the length of first pattern', async () => {
        await loadBasicPage();

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
        ]);

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
        ));

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(0, 0, 128)'],
            ['body', 'color', 'rgb(255, 255, 255)'],
            ['h1', 'color', 'rgb(255, 165, 0)'],
        ]);

        await devtoolsUtils.reset();
    });

    it('BUG COMPATIBILITY: If multiple matching URL patterns of the same length are found, select the first one', async () => {
        await loadBasicPage();

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(255, 26, 26)'],
        ]);

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
        ));

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(0, 0, 128)'],
            ['body', 'color', 'rgb(255, 255, 255)'],
            ['h1', 'color', 'rgb(255, 165, 0)'],
        ]);

        await devtoolsUtils.reset();
    });
});
