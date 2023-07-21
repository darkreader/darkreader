import {multiline} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

describe('Link override', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('should override link style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <link rel="stylesheet" href="style.css"/>',
                '</head>',
                '<body>',
                '    <h1>Link style <strong>override</strong>!</h1>',
                '</body>',
                '</html>',
            ),
            '/style.css': multiline(
                'body { background: gray; }',
                'h1 strong { color: red; }',
            ),
        });

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'background-color', 'rgb(96, 104, 108)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],
            ['h1 strong', 'color', 'rgb(255, 26, 26)'],
        ]);
    });

    it('should override CORS style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                `    <link rel="stylesheet" href="${corsURL}/style.css"/>`,
                '</head>',
                '<body>',
                '    <h1>CORS style <strong>override</strong>!</h1>',
                '</body>',
                '</html>',
            ),
            cors: {
                '/style.css': multiline(
                    'body { background: gray; }',
                    'h1 strong { color: red; }',
                ),
            },
        });

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'background-color', 'rgb(96, 104, 108)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],
            ['h1 strong', 'color', 'rgb(255, 26, 26)'],
        ]);
    });

    it('should wait till style is loading', async () => {
        let proceedCSSResponse: () => void;

        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <link rel="stylesheet" href="style.css"/>',
                '</head>',
                '<body>',
                '    <h1>Link loading <strong>delay</strong></h1>',
                '</body>',
                '</html>',
            ),
            '/style.css': async (_, res) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/css');

                await new Promise<void>((resolve) => proceedCSSResponse = resolve);

                res.end(multiline(
                    'body { background: gray; }',
                    'h1 strong { color: red; }',
                ), 'utf8');
            },
        }, {
            waitUntil: 'domcontentloaded',
        });

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],
            ['h1 strong', 'color', 'rgb(232, 230, 227)'],
        ]);

        proceedCSSResponse();

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'background-color', 'rgb(96, 104, 108)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],
            ['h1 strong', 'color', 'rgb(255, 26, 26)'],
        ]);
    });
});
