import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {injectProxy} from '../../../src/inject/dynamic-theme/stylesheet-proxy';
import {isFirefox} from '../../../src/utils/platform';
import {stubChromeRuntimeGetURL} from '../support/background-stub';
import {getJSEchoURL} from '../support/echo-client';
import {multiline, timeout, waitForEvent} from '../support/test-utils';

const theme = {
    ...DEFAULT_THEME,
    darkSchemeBackgroundColor: 'black',
    darkSchemeTextColor: 'white',
};
let container: HTMLElement;

beforeAll(() => {
    const loader = multiline(
        '(function loader() {',
        '    document && document.currentScript && document.currentScript.remove();',
        '    const argString = document && document.currentScript && document.currentScript.dataset.arg;',
        '    if (argString !== undefined) {',
        '        const arg = JSON.parse(argString);',
        `        (${injectProxy.toString()})(arg);`,
        '    }',
        '})()',
    );
    const url = getJSEchoURL(loader);
    stubChromeRuntimeGetURL('inject/proxy.js', url);
});

beforeEach(() => {
    container = document.body;
    container.innerHTML = '';
});

afterEach(() => {
    removeDynamicTheme();
    container.innerHTML = '';
    document.documentElement.removeAttribute('style');
});

describe('CSS VARIABLES OVERRIDE', () => {
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

    it('should override style with variables(that contain spaces)', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --bg: gray;',
            '        --text: red;',
            '    }',
            '    h1 { background: var( --bg ); }',
            '    h1 strong { color: var( --text ); }',
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

    it('should handle shorthand background with deep color refs', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --red: red;',
            '        --bg: var(--red);',
            '    }',
            '    h1 {',
            '        background: var(--bg);',
            '    }',
            '</style>',
            '<h1>CSS <strong>variables</strong></h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
    });

    it('should handle background with deep color refs (backwards)', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        background: var(--bg);',
            '    }',
            '    :root {',
            '        --red: red;',
            '        --bg: var(--red);',
            '    }',
            '</style>',
            '<h1>CSS <strong>variables</strong></h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
    });

    it('should handle multi-type vars with deep color refs', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        background: var(--bg);',
            '        color: var(--red);',
            '    }',
            '    :root {',
            '        --red: red;',
            '        --bg: var(--red);',
            '    }',
            '</style>',
            '<h1>CSS <strong>variables</strong></h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

    it('should handle variables having multiple types', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --dark: red;',
            '        --light: green;',
            '    }',
            '    .dark {',
            '        background-color: var(--dark);',
            '        color: var(--light);',
            '    }',
            '    .light {',
            '        background: var(--light);',
            '        color: var(--dark);',
            '    }',
            '</style>',
            '<h1 class="dark">Dark background light text</h1>',
            '<h1 class="light">Light background dark text</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('.dark')).backgroundColor).toBe('rgb(204, 0, 0)');
        expect(getComputedStyle(container.querySelector('.dark')).color).toBe('rgb(140, 255, 140)');
        expect(getComputedStyle(container.querySelector('.light')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(container.querySelector('.light')).color).toBe('rgb(255, 26, 26)');
    });

    /*
    it('should handle variables having multiple types in shorthand properties', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --color: green;',
            '    }',
            '    h1 {',
            '        border: 1px solid var(--color);',
            '    }',
            '    h1 {',
            '        background: linear-gradient(var(--color), white);',
            '    }',
            '</style>',
            '<h1>Variables</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toBe('linear-gradient(rgb(0, 102, 0), rgb(0, 0, 0))');
        expect(getComputedStyle(container.querySelector('h1')).borderColor).toBe('rgb(0, 217, 0)');
    });
    */

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
        await timeout(0);
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
        await timeout(0);
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
    });

    it('should handle variables inside color values (constructed colors)', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --bg: 255, 255, 255;',
            '        --text: 0, 0, 0;',
            '    }',
            '</style>',
            '<style>',
            '    h1 {',
            '        background: rgb(var(--bg));',
            '        color: rgb(var(--text));',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('should use fallback when variable inside a color not found', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        background: rgb(var(--bg, 255, 0, 0));',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
    });

    it('should handle variables in constructed colors that refer to other vars', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --v255: 255;',
            '        --red: var(--v255), 0, 0;',
            '        --bg: var(--unknown, var(--red));',
            '        --text: var(--red);',
            '    }',
            '</style>',
            '<style>',
            '    h1 {',
            '        background: rgb(var(--bg));',
            '        color: rgb(var(--text));',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
    });

    it('should handle variables that refer to constructed colors', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --red: 255, 0, 0;',
            '        --blue: 0, 0, 255;',
            '        --rgb-blue: rgb(var(--blue));',
            '        --bg: rgb(var(--red));',
            '        --text: var(--rgb-blue);',
            '    }',
            '</style>',
            '<style>',
            '    h1 {',
            '        background: var(--bg);',
            '        color: var(--text);',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(51, 125, 255)');
    });

    it('should handle variables that refer to constructed colors asynchronously', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --red: 255, 0, 0;',
            '        --bg: rgb(var(--red));',
            '    }',
            '    h1 {',
            '        color: var(--text);',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            ':root {',
            '    --blue: 0, 0, 255;',
            '    --rgb-blue: rgb(var(--blue));',
            '    --text: var(--rgb-blue);',
            '}',
            'h1 {',
            '    background: var(--bg);',
            '}',
        );
        container.append(anotherStyle);
        await timeout(0);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(51, 125, 255)');
    });

    it('should handle variables that are both contructed and usual colors', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --red: 255, 0, 0;',
            '        --bg: green;',
            '    }',
            '    h1 {',
            '        --bg: rgb(var(--red));',
            '        background: var(--bg)',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
    });

    it('should handle cyclic references in constructed colors', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --bg: var(--text);',
            '        --text: var(--bg);',
            '    }',
            '</style>',
            '<style>',
            '    h1 {',
            '        background: rgb(var(--bg));',
            '        color: rgb(var(--text));',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('should handle variables inside border color values', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --red: 255, 0, 0;',
            '    }',
            '</style>',
            '<style>',
            '    h1 {',
            '        border: 1px solid rgb(var(--red));',
            '    }',
            '</style>',
            '<h1>Colors with variables inside</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const elementStyle = getComputedStyle(container.querySelector('h1'));
        if (isFirefox) {
            expect(elementStyle.borderTopColor).toBe('rgb(179, 0, 0)');
            expect(elementStyle.borderRightColor).toBe('rgb(179, 0, 0)');
            expect(elementStyle.borderBottomColor).toBe('rgb(179, 0, 0)');
            expect(elementStyle.borderLeftColor).toBe('rgb(179, 0, 0)');
        } else {
            expect(elementStyle.borderColor).toBe('rgb(179, 0, 0)');
        }
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

    it('should preserve media after change', () => {
        container.innerHTML = multiline(
            '<style>',
            '    @media screen and (min-width: 2px) {',
            '        /* This media should be used */',
            '        h1 {',
            '            --text: green;',
            '        }',
            '    }',
            '    @media screen and (max-width: 2px) {',
            '        /* This media should not be used */',
            '        h1 {',
            '            --text: red;',
            '        }',
            '    }',
            '    h1 { color: var(--text); }',
            '</style>',
            '<h1>Media after change</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');

        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should handle same selector with different variables', () => {
        container.innerHTML = multiline(
            '<style>',
            '    @media screen and (min-width: 2px) {',
            '        h1 {',
            '            --text: green;',
            '        }',
            '        h1 {',
            '            --bg: red;',
            '        }',
            '    }',
            '    h1 { color: var(--text); background-color: var(--bg); }',
            '</style>',
            '<h1>Media with same selectors</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(204, 0, 0)');
    });

    it('should properly modify variables in light mode', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --bg: white;',
            '        --text: black;',
            '    }',
            '    h1 {',
            '        background: var(--bg);',
            '        color: var(--text);',
            '    }',
            '</style>',
            '<h1>Light scheme</h1>',
        );
        const lightTheme = {...theme, mode: 0, lightSchemeBackgroundColor: '#dddddd', lightSchemeTextColor: '#222222'};
        createOrUpdateDynamicTheme(lightTheme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(221, 221, 221)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(34, 34, 34)');
    });

    it('should handle variables inside values', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --border-color: #ff0000;',
            '        --text: green;',
            '    }',
            '    h1 {',
            '        border-bottom: 2px solid var(--border-color);',
            '        color: var(--text);',
            '    }',
            '</style>',
            '<h1>Border with variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).borderBottomColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should handle variables that have variables inside', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --dark-red: #ff0000;',
            '        --border: 2px solid var(--dark-red);',
            '        --text: green;',
            '    }',
            '    h1 {',
            '        border: var(--border);',
            '        color: var(--text);',
            '    }',
            '</style>',
            '<h1>Border with variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).borderTopColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).borderBottomColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).borderLeftColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).borderRightColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should handle border color variables', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --border-color: green;',
            '    }',
            '    h1 {',
            '        border: 1px solid;',
            '        border-color: var(--border-color);',
            '    }',
            '</style>',
            '<h1>Border color with variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const elementStyle = getComputedStyle(container.querySelector('h1'));
        if (isFirefox) {
            expect(elementStyle.borderTopColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderRightColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderBottomColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderLeftColor).toBe('rgb(0, 217, 0)');
        } else {
            expect(elementStyle.borderColor).toBe('rgb(0, 217, 0)');
        }
    });

    it('should handle variables with gradients', () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --text: red;',
            '        --gradient: linear-gradient(red, white);',
            '        --bg: green;',
            '    }',
            '    h1 {',
            '        color: var(--text);',
            '        background-color: var(--bg);',
            '        background-image: var(--gradient);',
            '    }',
            '    h2 {',
            '        background: var(--gradient);',
            '    }',
            '</style>',
            '<h1>Weow Gradients</h1>',
            '<h2>Gradient 2</h2>'
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toBe('linear-gradient(rgb(204, 0, 0), rgb(0, 0, 0))');
        expect(getComputedStyle(container.querySelector('h2')).backgroundImage).toBe('linear-gradient(rgb(204, 0, 0), rgb(0, 0, 0))');
    });

    it('should handle variables with background images', async () => {
        const darkIcon = multiline(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8">',
            '    <circle fill="black" cx="4" cy="4" r="3" />',
            '</svg>',
        );
        const redCross = multiline(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8">',
            '    <path fill="red" d="M3,1 h2 v2 h2 v2 h-2 v2 h-2 v-2 h-2 v-2 h2 z" />',
            '</svg>',
        );
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            `        --icon: url("data:image/svg+xml;base64,${btoa(darkIcon)}");`,
            `        --red-cross: url("data:image/svg+xml;base64,${btoa(redCross)}");`,
            '        --bg: green;',
            '    }',
            '    .icon1 {',
            '        background-color: var(--bg);',
            '        background-image: var(--icon);',
            '        background-repeat: no-repeat;',
            '        background-size: 100%;',
            '        display: inline-block;',
            '        height: 1rem;',
            '        width: 1rem;',
            '    }',
            '    .icon2 {',
            '        background: no-repeat center/100% var(--icon);',
            '        display: inline-block;',
            '        height: 1rem;',
            '        width: 1rem;',
            '    }',
            '    .icon3 {',
            '        background: no-repeat center/100% var(--red-cross), no-repeat center/100% var(--icon);',
            '        display: inline-block;',
            '        height: 1rem;',
            '        width: 1rem;',
            '    }',
            '</style>',
            '<h1>',
            '    <i class="icon1"></i>',
            '    <i class="icon2"></i>',
            '    <i class="icon3"></i>',
            '    Icons',
            '</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        expect(getComputedStyle(container.querySelector('.icon1')).backgroundImage).toMatch(/^url\("blob:.*"\)$/);
        expect(getComputedStyle(container.querySelector('.icon2')).backgroundImage).toMatch(/^url\("blob:.*"\)$/);
        expect(getComputedStyle(container.querySelector('.icon3')).backgroundImage).toMatch(/^url\("blob:.*"\), url\("blob:.*"\)$/);
    });

    it('should handle variables with gradients and images', async () => {
        const darkIcon = multiline(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8">',
            '    <circle fill="black" cx="4" cy="4" r="3" />',
            '</svg>',
        );
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            `        --icon: url("data:image/svg+xml;base64,${btoa(darkIcon)}");`,
            '        --gradient: linear-gradient(red, white);',
            '    }',
            '    .icon {',
            '        background: no-repeat center/100% var(--icon), var(--gradient);',
            '        display: inline-block;',
            '        height: 1rem;',
            '        width: 1rem;',
            '    }',
            '</style>',
            '<h1><i class="icon"></i>Mixed background</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        expect(getComputedStyle(container.querySelector('.icon')).backgroundImage).toMatch(/^url\("blob:.*"\), linear-gradient\(rgb\(204, 0, 0\), rgb\(0, 0, 0\)\)$/);
    });

    it('should handle asynchronous variable type resolution', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --color1: red;',
            '        --color2: green;',
            '    }',
            '</style>',
            '<h1>Asynchronous variables</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            'h1 {',
            '    background: var(--color2);',
            '    color: var(--color1);',
            '}',
        );
        container.append(anotherStyle);
        await timeout(0);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

    it('should handle async resolution of multiple variable types', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --color: green;',
            '    }',
            '</style>',
            '<h1>Asynchronous variables with multiple types</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            'h1 {',
            '    background: var(--color);',
            '    border: 1px solid var(--color);',
            '    color: var(--color);',
            '}',
        );
        container.append(anotherStyle);
        await timeout(0);
        const updatedStyle = getComputedStyle(container.querySelector('h1'));
        expect(updatedStyle.backgroundColor).toBe('rgb(0, 102, 0)');
        expect(updatedStyle.color).toBe('rgb(140, 255, 140)');
        if (isFirefox) {
            expect(updatedStyle.borderTopColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderRightColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderBottomColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderLeftColor).toBe('rgb(0, 217, 0)');
        } else {
            expect(updatedStyle.borderColor).toBe('rgb(0, 217, 0)');
        }
    });

    it('should handle variable type resolution when style changed', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --color1: yellow;',
            '        --color2: blue;',
            '    }',
            '</style>',
            '<h1>Asynchronous variables</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');

        const styleEl = container.querySelector('style');
        styleEl.textContent = multiline(
            ':root {',
            '    --color1: red;',
            '    --color2: green;',
            '    --color3: blue;',
            '}',
        );
        await timeout(0);

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            'h1 {',
            '    background: var(--color2);',
            '    color: var(--color1);',
            '}',
        );
        container.append(anotherStyle);
        await timeout(0);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

    it('should handle variable type change', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --color: green;',
            '    }',
            '    h1 {',
            '        background: var(--color);',
            '    }',
            '</style>',
            '<h1>Asynchronous variables</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            'h1 {',
            '    color: var(--color);',
            '}',
        );
        container.append(anotherStyle);
        await timeout(0);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(140, 255, 140)');
    });

    it('should rebuild dependant variable rule when type becomes known', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        background: var(--color);',
            '    }',
            '</style>',
            '<h1>Asynchronous variables</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgba(0, 0, 0, 0)');

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            ':root {',
            '    --color: green;',
            '}',
        );
        container.append(anotherStyle);
        await timeout(50);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(0, 102, 0)');
    });

    it('should not affect other declarations when variable type resolved', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    :root {',
            '        --color1: red;',
            '        --color2: green;',
            '    }',
            '</style>',
            '<h1 class="color1">Variables with color 1</h1>',
            '<h1 class="color2">Variables with color 2</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('.color1')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(container.querySelector('.color1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('.color2')).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(getComputedStyle(container.querySelector('.color2')).color).toBe('rgb(255, 255, 255)');

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            '.color1 {',
            '    background: var(--color1);',
            '    color: var(--color1);',
            '}',
            '.color2 {',
            '    background: var(--color2);',
            '    color: var(--color2);',
            '}',
        );
        container.append(anotherStyle);
        await timeout(0);
        expect(getComputedStyle(container.querySelector('.color1')).backgroundColor).toBe('rgb(204, 0, 0)');
        expect(getComputedStyle(container.querySelector('.color1')).color).toBe('rgb(255, 26, 26)');
        expect(getComputedStyle(container.querySelector('.color2')).backgroundColor).toBe('rgb(0, 102, 0)');
        expect(getComputedStyle(container.querySelector('.color2')).color).toBe('rgb(140, 255, 140)');
    });

    it('should not affect other declarations when variable type resolved', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        --color-bg: red;',
            '        border: green;',
            '    }',
            '    h1 {',
            '        --color-text: green;',
            '    }',
            '</style>',
            '<h1>Variables along with other declarations</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const elementStyle = getComputedStyle(container.querySelector('h1'));
        expect(elementStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(elementStyle.color).toBe('rgb(255, 255, 255)');
        if (isFirefox) {
            expect(elementStyle.borderTopColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderRightColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderBottomColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderLeftColor).toBe('rgb(0, 217, 0)');
        } else {
            expect(elementStyle.borderColor).toBe('rgb(0, 217, 0)');
        }

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            'h1 {',
            '    background-color: var(--color-bg);',
            '    color: var(--color-text);',
            '}',
        );
        container.append(anotherStyle);
        await timeout(0);
        const updatedStyle = getComputedStyle(container.querySelector('h1'));
        expect(updatedStyle.backgroundColor).toBe('rgb(204, 0, 0)');
        expect(updatedStyle.color).toBe('rgb(140, 255, 140)');
        if (isFirefox) {
            expect(updatedStyle.borderTopColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderRightColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderBottomColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderLeftColor).toBe('rgb(0, 217, 0)');
        } else {
            expect(updatedStyle.borderColor).toBe('rgb(0, 217, 0)');
        }
    });

    it('should not affect other declarations when dependency variable type resolved', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        background: var(--color);',
            '        border: green;',
            '    }',
            '    h1 {',
            '        color: red;',
            '    }',
            '</style>',
            '<h1>Dependency variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const elementStyle = getComputedStyle(container.querySelector('h1'));
        expect(elementStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(elementStyle.color).toBe('rgb(255, 26, 26)');
        if (isFirefox) {
            expect(elementStyle.borderTopColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderRightColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderBottomColor).toBe('rgb(0, 217, 0)');
            expect(elementStyle.borderLeftColor).toBe('rgb(0, 217, 0)');
        } else {
            expect(elementStyle.borderColor).toBe('rgb(0, 217, 0)');
        }

        const anotherStyle = document.createElement('style');
        anotherStyle.textContent = multiline(
            ':root {',
            '    --color: green;',
            '}',
        );
        container.append(anotherStyle);
        await timeout(50);
        const updatedStyle = getComputedStyle(container.querySelector('h1'));
        expect(updatedStyle.backgroundColor).toBe('rgb(0, 102, 0)');
        expect(updatedStyle.color).toBe('rgb(255, 26, 26)');
        if (isFirefox) {
            expect(updatedStyle.borderTopColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderRightColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderBottomColor).toBe('rgb(0, 217, 0)');
            expect(updatedStyle.borderLeftColor).toBe('rgb(0, 217, 0)');
        } else {
            expect(updatedStyle.borderColor).toBe('rgb(0, 217, 0)');
        }
    });

    it('should add variables to root after the variable type is discovered', async () => {
        document.documentElement.setAttribute('style', '--text: red;');
        container.innerHTML = multiline(
            '<style class="testcase-sheet">',
            '</style>',
            '<h1>Dependency variable</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const sheet = (document.querySelector('.testcase-sheet') as HTMLStyleElement).sheet;
        sheet.insertRule('h1 { color: var(--text);');

        await timeout(0);
        expect(getComputedStyle(document.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

    it('should modify the caret-color property', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    * {',
            '        --caret-color: green;',
            '    }',
            '    h1 {',
            '        caret-color: var(--caret-color);',
            '    }',
            '</style>',
            '<h1>Caret Color</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(0);
        const elementStyle = getComputedStyle(container.querySelector('h1'));

        expect(elementStyle.caretColor).toBe('rgb(140, 255, 140)');
    });

    it('should modify the box-shadow actual color values in a variable', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        --offset: 8px;',
            '    }',
            '    h1 {',
            '        box-shadow: calc(var(--offset)*-1 - 1px) 0 0 0 #fff',
            '    }',
            '</style>',
            '<h1>COmplicated shit :(</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(0);
        const elementStyle = getComputedStyle(container.querySelector('h1'));

        expect(elementStyle.boxShadow).toBe('rgb(0, 0, 0) -9px 0px 0px 0px');
    });

    it(`shouldn't modify the raw value of box-shadow when their is no color`, async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        --color-border-muted: green;',
            '    }',
            '    h1 {',
            '        box-shadow: inset 0 -1px 0 var(--color-border-muted)',
            '    }',
            '</style>',
            '<h1>COmplicated shit :(</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(0);
        const elementStyle = getComputedStyle(container.querySelector('h1'));

        expect(elementStyle.boxShadow).toBe('rgb(0, 102, 0) 0px -1px 0px 0px inset');
    });

    it('should handle raw values within variable declarations and use proper replacement', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        border: 1px solid rgba(var(--color,240,240,240),1);',
            '    }',
            '    :root {',
            '        --color: 123,123,123 !important;',
            '    }',
            '    div {',
            '        --color: 0,0,0 !important;',
            '    }',
            '</style>',
            '<h1>Raw values are spooky</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(0);
        const elementStyle = getComputedStyle(container.querySelector('h1'));

        if (isFirefox) {
            expect(elementStyle.borderTopColor).toBe('rgb(91, 91, 91)');
            expect(elementStyle.borderRightColor).toBe('rgb(91, 91, 91)');
            expect(elementStyle.borderBottomColor).toBe('rgb(91, 91, 91)');
            expect(elementStyle.borderLeftColor).toBe('rgb(91, 91, 91)');
        } else {
            expect(elementStyle.borderColor).toBe('rgb(91, 91, 91)');
        }
    });

    it('should modify inline variable', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 {',
            '        background-color: var(--inline-var);',
            '    }',
            '</style>',
            '<h1 style="--inline-var: red">Raw values are spooky</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        const elementStyle = getComputedStyle(container.querySelector('h1'));
        expect(elementStyle.backgroundColor).toBe('rgb(204, 0, 0)');
    });
});
