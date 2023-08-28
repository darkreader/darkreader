import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
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

describe('MEDIA QUERIES', () => {
    it('should not style blacklisted media', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    h1 { background: green; }',
            '    h1 strong { color: orange; }',
            '</style>',
            '<style class="testcase-style-2" media="print">',
            '    h1 { background: gray; }',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
        );

        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(255, 174, 26)');
        expect(document.querySelector('.testcase-style-2').nextElementSibling.classList.contains('darkreader--sync')).toBe(false);
    });

    it('should style lazyloaded media', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style" media="print">',
            '    h1 { background: green; }',
            '    h1 strong { color: orange; }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
        );

        createOrUpdateDynamicTheme(theme, null, false);

        (document.querySelector('.testcase-style') as HTMLStyleElement).media = 'screen';
        await timeout(0);
        expect((document.querySelector('.testcase-style') as HTMLStyleElement).media).toBe('screen');
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(255, 174, 26)');
        expect(document.querySelector('.testcase-style').nextElementSibling.classList.contains('darkreader--sync')).toBe(true);
    });

    it('should check for CSS support', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    @supports (background: green) {',
            '       h1 { background: green; }',
            '    }',
            '    @supports (color: orange) {',
            '       h1 strong { color: orange; }',
            '    }',
            '    @supports (some-non-existing-prop: some-value) {',
            '       body { background: pink; }',
            '    }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
        );

        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(255, 174, 26)');
        expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('should check for CSS @media', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    @media screen and (min-width: 2px) {',
            '       h1 { background: green; }',
            '    }',
            '    @media screen and (min-width: 200000px) {',
            '       h1 { background: orange; }',
            '    }',
            '</style>',
            '<h1>Some test media query i guess</h1>',
        );

        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect((document.querySelector('.testcase-style').nextElementSibling as HTMLStyleElement).sheet.cssRules.length).toBe(2);
    });

    it('should check for nested CSS @media', async () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '   @media screen and (min-width: 2px) {',
            '       @media screen and (min-width: 2px) {',
            '           h1 { background: green; }',
            '       }',
            '   }',
            '   @media screen and (min-width: 200000px) {',
            '       h1 { background: orange; }',
            '   }',
            '</style>',
            '<h1>Some test media query i guess</h1>',
        );

        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect((document.querySelector('.testcase-style').nextElementSibling as HTMLStyleElement).sheet.cssRules.length).toBe(2);
    });

    it('should style print/media query', () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    h1 { background: green; }',
            '    h1 strong { color: orange; }',
            '</style>',
            '<style class="testcase-style-2" media="print, screen and (max-width: 9999999px)">',
            '    h1 { background: gray; }',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uh media query :D</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
        expect(document.querySelector('.testcase-style-2').nextElementSibling.classList.contains('darkreader--sync')).toBe(true);
    });

    it('should handle same cssText but different media rule', () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '   @media screen and (min-width: 200000000000000000000px) {',
            '       h1 { background: green; }',
            '   }',
            '   @media screen and (min-width: 4px) {',
            '       h1 { background: green; }',
            '   }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
        );

        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
    });

    it('should not style blacklisted media and handle uppercase media', () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '    h1 { background: green; }',
            '    h1 strong { color: orange; }',
            '</style>',
            '<style class="testcase-style-2" media="Print">',
            '    h1 { background: gray; }',
            '    h1 strong { color: red; }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
        );

        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(document.querySelector('h1 strong')).color).toBe('rgb(255, 174, 26)');
        expect(document.querySelector('.testcase-style-2').nextElementSibling.classList.contains('darkreader--sync')).toBe(false);
    });

    it('should handle media query and print', () => {
        container.innerHTML = multiline(
            '<style class="testcase-style">',
            '   @media (min-width: 2px), print {',
            '       h1 { background: green; }',
            '   }',
            '</style>',
            '<h1>Some test foor...... <strong>Oh uhm removing styles :(</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
    });
});
