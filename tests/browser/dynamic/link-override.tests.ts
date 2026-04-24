import {multiline} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

describe('Link override', () => {
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
        const styleResolvers: Array<() => any> = [];
        let didStyleResolve = false;

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

                // For some reason Firefox 151 performs two requests.
                // Only the second has effect on page's look.
                if (!didStyleResolve) {
                    await new Promise<void>((resolve) => styleResolvers.push(resolve));
                }

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

        styleResolvers.forEach((resolve) => resolve());
        didStyleResolve = true;

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'background-color', 'rgb(96, 104, 108)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],
            ['h1 strong', 'color', 'rgb(255, 26, 26)'],
        ]);
    });
});
