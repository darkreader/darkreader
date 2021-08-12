import {multiline} from '../../test-utils';

describe('Style override', () => {
    it('should override user agent style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body>',
                '    Text',
                '    <a href="#">Link</a>',
                '</body>',
                '</html>',
            ),
        });

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.documentElement).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('a')).color)).resolves.toBe('rgb(51, 145, 255)');
    });

    it('should override static style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '    <style>',
                '        body { background: gray; }',
                '        h1 strong { color: red; }',
                '    </style>',
                '</head>',
                '<body>',
                '    <h1>Style <strong>override</strong>!</h1>',
                '</body>',
                '</html>',
            ),
        });

        await expect(page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).resolves.toBe('rgb(24, 26, 27)');
        await expect(page.evaluate(() => getComputedStyle(document.body).backgroundColor)).resolves.toBe('rgb(96, 104, 108)');
        await expect(page.evaluate(() => getComputedStyle(document.body).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(232, 230, 227)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 26, 26)');
    });

    it('should restore override', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body>',
                '    <h1>Style <strong>override</strong>!</h1>',
                '</body>',
                '</html>',
            ),
        });

        await page.evaluate(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray }');
            styleElement.sheet.insertRule('strong { color: red }');
        });

        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1')).color)).resolves.toBe('rgb(152, 143, 129)');
        await expect(page.evaluate(() => getComputedStyle(document.querySelector('h1 strong')).color)).resolves.toBe('rgb(255, 26, 26)');

        await expect(page.evaluate(async () => {
            const style = document.querySelector('.testcase-style');
            style.nextSibling.remove();
            await new Promise((resolve) => setTimeout(resolve));
            return (style.nextSibling as HTMLStyleElement).classList.contains('darkreader--sync');
        })).resolves.toBe(true);
    });

    it('should move override', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body>',
                '    <h1>Some test foor...... <strong>Moving styles</strong>!</h1>',
                '</body>',
                '</html>',
            ),
        });

        await page.evaluate(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray } ');
            styleElement.sheet.insertRule('strong { color: red } ');
        });

        await expect(page.evaluate(async () => {
            const style = document.querySelector('.testcase-style');
            document.body.append(style);
            await new Promise((resolve) => setTimeout(resolve));
            return (style.nextSibling as HTMLStyleElement).classList.contains('darkreader--sync');
        })).resolves.toBe(true);
    });

    it('should remove override', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body>',
                '    <h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
                '</body>',
                '</html>',
            ),
        });

        await page.evaluate(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray }');
            styleElement.sheet.insertRule('strong { color: red }');
        });

        await expect(page.evaluate(async () => {
            const style = document.querySelector('.testcase-style');
            const sibling = style.nextSibling;
            style.remove();
            await new Promise((resolve) => setTimeout(resolve));
            return sibling.isConnected && !((sibling as HTMLStyleElement).classList.contains('darkreader--sync'));
        })).resolves.toBe(false);
    });

    it('should react to updated style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body>',
                '    <h1>Some test foor...... <strong>Oh uhm a pink background</strong></h1>',
                '</body>',
                '</html>',
            ),
        });

        await page.evaluate(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray }');
            styleElement.sheet.insertRule('strong { color: red }');
        });

        await expect(page.evaluate(async () => {
            const style = document.querySelector('.testcase-style');
            (style as HTMLStyleElement).sheet.insertRule('html { background-color: pink }');
            await new Promise((resolve) => setTimeout(resolve));
            return (style.nextSibling as HTMLStyleElement).sheet.cssRules[0].cssText;
        })).resolves.toBe('html { background-color: rgb(89, 0, 16); }');
    });

    it('should react to a new style', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body>',
                '    <h1>Some test foor...... <strong>Oh uhm what?</strong>!</h1>',
                '</body>',
                '</html>',
            ),
        });

        await expect(page.evaluate(async () => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: pink }');
            styleElement.sheet.insertRule('strong { color: orange }');
            await new Promise((resolve) => setTimeout(resolve));
            return (styleElement.nextSibling as HTMLStyleElement).sheet.cssRules.length === 2 && (styleElement.nextSibling as HTMLStyleElement).classList.contains('darkreader--sync');
        })).resolves.toBe(true);
    });

    it('should handle defined custom elements', async () => {
        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body>',
                '<custom-element>',
                '</custom-element>',
                '</body>',
                '</html>',
            ),
        });

        await expect(page.evaluate(async () => {
            class CustomElement extends HTMLElement {
                constructor() {
                    super();
                    const shadowRoot = this.attachShadow({mode: 'open'});
                    const style = document.createElement('style');
                    style.textContent = 'p { color: pink }';
                    const paragraph = document.createElement('p');
                    paragraph.textContent = 'Some text content that should be pink.';

                    shadowRoot.append(style);
                    shadowRoot.append(paragraph);
                }
            }

            customElements.define('custom-element', CustomElement);
            await new Promise((resolve) => setTimeout(resolve, 100));
            const shadowRoot = document.querySelector('custom-element').shadowRoot;
            return getComputedStyle(shadowRoot.querySelector('p')).color;
        })).resolves.toBe('rgb(255, 160, 177)');
    });
});
