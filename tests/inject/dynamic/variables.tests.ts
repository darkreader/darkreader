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

    /*
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
    */

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
            '        border: 2px solid var(--border-color);',
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
        await timeout(50);
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
        await timeout(50);
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
});
