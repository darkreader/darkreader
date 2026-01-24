import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {createStyleSheetModifier} from '../../../src/inject/dynamic-theme/stylesheet-modifier';
import {multiline, timeout} from '../support/test-utils';

const theme = {
    ...DEFAULT_THEME,
    darkSchemeBackgroundColor: 'black',
    darkSchemeTextColor: 'white',
};
let container: HTMLElement;

beforeEach(() => {
    container = document.body;
    container.innerHTML = '';
});

afterEach(() => {
    removeDynamicTheme();
    container.innerHTML = '';
});

describe('STYLE ELEMENTS', () => {
    it('should fill CSSStyleSheet with overridden rules', () => {
        const style = document.createElement('style');
        style.textContent = 'body { background-color: white; } h1 { color: black; }';
        container.append(style);

        const modifier = createStyleSheetModifier();
        const overrideStyle = document.createElement('style');
        container.append(overrideStyle);
        const override = overrideStyle.sheet;
        modifier.modifySheet({
            theme,
            sourceCSSRules: style.sheet.cssRules,
            ignoreImageAnalysis: [],
            force: false,
            prepareSheet: () => override,
            isAsyncCancelled: () => false,
        });

        expect(override.cssRules.length).toBe(2);
        expect((override.cssRules[0] as CSSStyleRule).selectorText).toBe('body');
        expect((override.cssRules[0] as CSSStyleRule).style.getPropertyValue('background-color')).toBe('var(--darkreader-background-ffffff, #000000)');
        expect((override.cssRules[1] as CSSStyleRule).selectorText).toBe('h1');
        expect((override.cssRules[1] as CSSStyleRule).style.getPropertyValue('color')).toBe('var(--darkreader-text-000000, #ffffff)');
    });

    it('should override User Agent style', async () => {
        container.innerHTML = multiline(
            '<span>Text</span>',
            '<a href="#">Link</a>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('span')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('a')).color).toBe('rgb(51, 145, 255)');
    });

    it('should override static style', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background: gray; }',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Style <strong>override</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should override style with @import', async () => {
        container.innerHTML = multiline(
            '<style>',
            `    @import "data:text/css;utf8,${encodeURIComponent('h1 { background: gray; }')}";`,
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Style <strong>with @import</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(50);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should override style with @import"..."', async () => {
        container.innerHTML = multiline(
            '<style>',
            `    @import"data:text/css;utf8,${encodeURIComponent('h1 { background: gray; }')}";`,
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Style <strong>with @import"..."</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(50);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should restore override', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    h1 { color: gray; }',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Style <strong>override</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(141, 141, 141)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');

        const style = document.querySelector('.testcase-style');
        style.nextSibling.remove();
        await timeout(0);
        expect((style.nextSibling as HTMLStyleElement).classList.contains('darkreader--sync')).toBe(true);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(141, 141, 141)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should move override', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    h1 { background: gray; }',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Some test foor...... <strong>Moving styles</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');

        const style = document.querySelector('.testcase-style');
        container.append(style);
        await timeout(0);
        expect((style.nextSibling as HTMLStyleElement).classList.contains('darkreader--sync')).toBe(true);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should remove override', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    h1 { background: gray; }',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const style = document.querySelector('.testcase-style');
        const sibling = style.nextSibling;
        style.remove();
        await timeout(0);
        expect(sibling.isConnected).toBe(false);
        expect(document.querySelector('.darkreader--sync')).toBe(null);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 255, 255)');
    });

    it('should react to updated style', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style"></style>',
            '<h1>Some test foor...... <strong>Oh uhm a pink background</strong></h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        const style: HTMLStyleElement = document.querySelector('.testcase-style');
        style.sheet.insertRule('h1 { color: gray }');
        style.sheet.insertRule('strong { color: red }');
        style.sheet.insertRule('body { background-color: pink }');
        await timeout(0);
        expect((style.nextSibling as HTMLStyleElement).sheet.cssRules[0].cssText).toBe('body { background-color: var(--darkreader-background-ffc0cb, #320009); }');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(141, 141, 141)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
        expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(50, 0, 9)');
    });

    it('should react on style text change', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Style <strong>text change</strong></h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');

        document.querySelector('.testcase-style').textContent = 'h1 strong { color: green; }';
        await timeout(0);
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(140, 255, 140)');
    });

    it('should react to a new style', async () => {
        container.innerHTML = multiline(
            '<h1>Some test foor...... <strong>Oh uhm what?</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        const style: HTMLStyleElement = document.createElement('style');
        style.classList.add('testcase-style');
        container.append(style);
        style.sheet.insertRule('h1 { color: pink }');
        style.sheet.insertRule('strong { color: orange }');

        await timeout(0);
        const newStyle: HTMLStyleElement = document.querySelector('.testcase-style');
        const nextSibling = newStyle.nextSibling as HTMLStyleElement;
        expect(nextSibling.sheet.cssRules.length).toBe(2);
        expect(nextSibling.classList.contains('darkreader--sync')).toBe(true);
        expect(getComputedStyle(document.querySelector('h1')).color).toBe('rgb(255, 198, 208)');
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(255, 174, 26)');
    });

    it('should restore override after container move', async () => {
        container.innerHTML = multiline(
            '<div class="style-container">',
            '    <style class="testcase-style">',
            '        h1 { background: gray; }',
            '        h1 { color: green; }',
            '    </style>',
            '</div>',
            '<h1>Moving container</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');

        const styleContainer = document.querySelector('.style-container');
        const style = styleContainer.querySelector('.testcase-style');
        const override = style.nextElementSibling as HTMLStyleElement;
        container.append(styleContainer);
        await timeout(0);
        expect(style.nextElementSibling).toBe(override);
        expect(override.sheet.cssRules.length).toBe(2);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });
});
