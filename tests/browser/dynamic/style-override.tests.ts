import {multiline} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

describe('Style override', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

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

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['document', 'color', 'rgb(232, 230, 227)'],
            ['body', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['a', 'color', 'rgb(51, 145, 255)'],
        ]);
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

        await expectStyles([
            ['document', 'background-color', 'rgb(24, 26, 27)'],
            ['body', 'background-color', 'rgb(96, 104, 108)'],
            ['body', 'color', 'rgb(232, 230, 227)'],
            ['h1', 'color', 'rgb(232, 230, 227)'],
            ['h1 strong', 'color', 'rgb(255, 26, 26)'],
        ]);
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

        await pageUtils.evaluateScript(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray }');
            styleElement.sheet.insertRule('strong { color: red }');
        });

        await expectStyles([
            ['h1', 'color', 'rgb(152, 143, 129)'],
            ['h1 strong', 'color', 'rgb(255, 26, 26)'],
        ]);

        await expect(pageUtils.evaluateScript(async () => {
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

        await pageUtils.evaluateScript(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray } ');
            styleElement.sheet.insertRule('strong { color: red } ');
        });

        await expect(pageUtils.evaluateScript(async () => {
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

        await pageUtils.evaluateScript(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray }');
            styleElement.sheet.insertRule('strong { color: red }');
        });

        await expect(pageUtils.evaluateScript(async () => {
            const style = document.querySelector('.testcase-style');
            const sibling = style.nextSibling;
            style.remove();
            await new Promise((resolve) => setTimeout(resolve));
            return sibling.isConnected && !((sibling as HTMLStyleElement).classList.contains('darkreader--sync'));
        })).resolves.toBe(false);
    });

    it('should react to updated style', async () => {
        if (product === 'firefox') {
            expect(true);
            return;
        }
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

        await pageUtils.evaluateScript(() => {
            const styleElement = document.createElement('style');
            styleElement.classList.add('testcase-style');
            document.head.append(styleElement);
            styleElement.sheet.insertRule('h1 { color: gray }');
            styleElement.sheet.insertRule('strong { color: red }');
        });

        await expect(pageUtils.evaluateScript(async () => {
            const style = document.querySelector('.testcase-style');
            (style as HTMLStyleElement).sheet.insertRule('html { background-color: pink }');
            await new Promise((resolve) => setTimeout(resolve));
            return (style.nextSibling as HTMLStyleElement).sheet.cssRules[0].cssText;
        })).resolves.toBe('html { background-color: var(--darkreader-background-ffc0cb, #590010); }');
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

        await expect(pageUtils.evaluateScript(async () => {
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
        if (product === 'firefox') {
            return;
        }
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

        pageUtils.evaluateScript(async () => {
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
        });

        await expectStyles([
            [['custom-element', 'p'], 'color', 'rgb(255, 160, 177)'],
        ]);
    });
});
