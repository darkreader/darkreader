import '../polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline, timeout} from '../../test-utils';

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
    document.documentElement.removeAttribute('style');
});

describe('CSS Variables Override', () => {
    it('should override style with variables', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --bg: gray;',
            '        --text: red;',
            '    }',
            '    h1 { background: var(--bg); }',
            '    h1 strong { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should override style with variables (reverse order)', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background: var(--bg); }',
            '    h1 strong { color: var(--text); }',
            '</style>',
            '<style>',
            '    :root {',
            '        --bg: gray;',
            '        --text: green;',
            '    }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(140, 255, 140)');
    });

    it('should skip undefined variables', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background: var(--bg); }',
            '    h1 strong { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 255, 255)');
    });

    it('should use fallback variable value', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { color: var(--text, red); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

    it('should not use fallback variable value', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --text: green;',
            '    }',
            '    h1 { color: var(--text, red); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should handle variables referencing other variables', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --alert: red;',
            '        --text: var(--alert);',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

    it('should handle variables referencing other variables (reverse order)', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --text: var(--alert);',
            '        --alert: red;',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

    it('should use fallback when nested variables are missing', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { color: var(--text, var(--alert, green)); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should not freeze on cyclic references', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --text: var(--text);',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
    });

    it('should not freeze on nested cyclic references', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --alert: var(--text);',
            '        --text: var(--alert);',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
    });
    it('should react on variable change', async () => {
        container.innerHTML = multiline(
            '<style id="variables">',
            '    :root {',
            '        --text: red;',
            '    }',
            '</style>',
            '<style>',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');

        const styleElement = document.getElementById('variables') as HTMLStyleElement;
        styleElement.textContent = ':root { --text: green; }';
        await timeout(100);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should use <html> element variables', async () => {
        document.documentElement.setAttribute('style', '--text: red;');
        container.innerHTML = multiline(
            '<style>',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>CSS <strong>variables</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');

        document.documentElement.setAttribute('style', '--text: green;');
        await timeout(100);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should consider variable selector', () => {
        container.innerHTML = multiline(
            '<style>',
            '    .red {',
            '        --text: red;',
            '    }',
            '    .green {',
            '        --text: green;',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1 class="red">Red CSS variable</h1>',
            '<h1 class="green">Green CSS variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('.red')).color).toBe('rgb(255, 26, 26)');
        expect(getComputedStyle(container.querySelector('.green')).color).toBe('rgb(140, 255, 140)');
    });

    it('should handle internal conversion of hex to RGB', async () => {
        container.innerHTML = multiline(
            '<style>',
            '   :root {',
            '       --bg: #fff;',
            '       --text: #000;',
            '   }',
            '</style>',
            '<style>',
            '   body {',
            '       color: var(--text);',
            '   }',
            '   h1 {',
            '       background: var(--bg);',
            '       color: var(--text);',
            '   }',
            '</style>',
            '<h1>Dark <strong>Theme</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container).color).toBe('rgb(255, 255, 255)');
    });

    it('should handle media variables', () => {
        container.innerHTML = multiline(
            '<style>',
            '    @media screen and (min-width: 2px) {',
            '        .red {',
            '            --text: red;',
            '        }',
            '        .orange {',
            '            --text: orange',
            '        }',
            '    }',
            '    @media screen and (min-width: 2000000px) {',
            '        .green {',
            '            --text: green;',
            '        }',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1 class="red">Red CSS variable</h1>',
            '<h1 class="green">Green CSS variable</h1>',
            '<h1 class="orange">Orange CSS variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('.red')).color).toBe('rgb(255, 26, 26)');
        expect(getComputedStyle(container.querySelector('.green')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('.orange')).color).toBe('rgb(255, 174, 26)');
    });

    it('should handle nested variables', () => {
        container.innerHTML = multiline(
            '<style>',
            '    @media screen and (min-width: 2px) {',
            '        @media screen and (min-width: 3px) {',
            '            .red {',
            '                --text: red;',
            '            }',
            '        }',
            '    }',
            '    @media screen and (min-width: 2px) {',
            '        @media screen and (min-width: 2000000px) {',
            '            .green {',
            '                --text: green;',
            '            }',
            '        }',
            '    }',
            '    @media screen and (min-width: 2000000px) {',
            '        @media screen and (min-width: 2px) {',
            '            .orange {',
            '                --text: orange;',
            '            }',
            '        }',
            '    }',
            '    h1 {',
            '        color: var(--text);',
            '    }',
            '</style>',
            '<h1 class="red">Red CSS variable</h1>',
            '<h1 class="green">Green CSS variable</h1>',
            '<h1 class="orange">Orange CSS variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('.red')).color).toBe('rgb(255, 26, 26)');
        expect(getComputedStyle(container.querySelector('.green')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('.orange')).color).toBe('rgb(255, 255, 255)');
    });

    it('should handle media with the same selectors', () => {
        container.innerHTML = multiline(
            '<style>',
            '    @media screen and (min-width: 2px) {',
            '        h1 {',
            '            --text: green;',
            '        }',
            '    }',
            '    @media screen and (max-width: 2px) {',
            '        h1 {',
            '            --text: red;',
            '        }',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>Media with same selectors</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });
});
