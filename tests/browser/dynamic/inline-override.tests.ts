import {multiline} from '../../test-utils';

describe('Inline style override', () => {
    const inlineStyleMarkup = multiline(
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '</head>',
        '<body>',
        '    <span style="color: red;">Inline style override</span>',
        '</body>',
        '</html>',
    );

    it('should override inline style', async () => {
        await loadTestPage({
            '/': inlineStyleMarkup,
        });

        await expect(page.evaluate(() => getComputedStyle(document.querySelector('span')).color)).resolves.toBe('rgb(255, 26, 26)');
    });

    it('should watch for inline style change', async () => {
        await loadTestPage({
            '/': inlineStyleMarkup,
        });

        await expect(page.evaluate(() => getComputedStyle(document.querySelector('span')).color)).resolves.toBe('rgb(255, 26, 26)');

        await expect(page.evaluate(async () => {
            const span = document.querySelector('span');
            span.style.color = 'green';
            await new Promise((resolve) => setTimeout(resolve));
            return getComputedStyle(span).color;
        })).resolves.toBe('rgb(114, 255, 114)');
    });
});
