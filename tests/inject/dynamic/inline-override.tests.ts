import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline, timeout} from '../support/test-utils';

declare const __PLUS__: boolean;

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

describe('INLINE STYLES', () => {
    it('should override inline style', () => {
        container.innerHTML = '<span style="color: red;">Inline style override</span>';
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(document.querySelector('span')!).color).toBe('rgb(255, 26, 26)');
    });

    it('should watch for inline style change', async () => {
        container.innerHTML = '<span style="color: red;">Watch inline style</span>';
        createOrUpdateDynamicTheme(theme, null, false);
        const span = document.querySelector('span')!;
        expect(getComputedStyle(span).color).toBe('rgb(255, 26, 26)');

        span.style.color = 'green';
        await timeout(0);
        expect(getComputedStyle(span).color).toBe('rgb(140, 255, 140)');
    });

    for (const attribute of ['data-darkreader-ignore-inline', 'data-darkreader-ignore-inline="true"']) {
        it(`should not mutate inline styles in a subtree with ${attribute}`, async () => {
            container.innerHTML = multiline(
                `<div ${attribute} style="color: red;">`,
                '    <div><span style="color: red;">Editor content</span></div>',
                '    <svg><path fill="red" d="M0 0h10v10z" /></svg>',
                '</div>',
                '<span style="color: red;">Outside editor</span>',
            );
            const editor = container.firstElementChild as HTMLElement;
            const originalHTML = editor.outerHTML;
            createOrUpdateDynamicTheme(theme, null, false);
            await timeout(0);
            expect(editor.outerHTML).toBe(originalHTML);
            expect(getComputedStyle(container.lastElementChild!).color).toBe('rgb(255, 26, 26)');

            editor.querySelector('span')!.style.color = 'green';
            editor.firstElementChild!.insertAdjacentHTML('beforeend', '<span style="color: blue;">New content</span>');
            const updatedHTML = editor.outerHTML;
            await timeout(0);
            expect(editor.outerHTML).toBe(updatedHTML);
        });
    }

    it('should ignore inline styles in a dynamically inserted opted-out subtree', async () => {
        createOrUpdateDynamicTheme(theme, null, false);
        const element = document.createElement('div');
        element.setAttribute('data-darkreader-ignore-inline', '');
        element.innerHTML = '<div><span style="color: red;">New content</span></div>';
        const originalHTML = element.outerHTML;
        container.appendChild(element);
        await timeout(0);
        expect(element.outerHTML).toBe(originalHTML);
    });

    it('should override only a single inline style property', async () => {
        container.innerHTML = multiline(
            '<style>.bg-gray { background: gray; }</style>',
            '<span class="bg-gray" style="color: red;">Inline style override</span>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const span = container.querySelector('span')!;
        expect(getComputedStyle(span).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(span).color).toBe('rgb(255, 26, 26)');

        span.style.color = 'green';
        await timeout(0);
        expect(getComputedStyle(span).color).toBe('rgb(140, 255, 140)');
        expect(getComputedStyle(span).backgroundColor).toBe('rgb(102, 102, 102)');
    });

    it('should override the bgcolor attribute', () => {
        container.innerHTML = '<table><tr><td bgcolor="red">Cell with bgcolor</td></tr></table>';
        createOrUpdateDynamicTheme(theme, null, false);
        const td = container.querySelector('td')!;
        expect(getComputedStyle(td).backgroundColor).not.toBe('rgb(255, 0, 0)');
        if (!__PLUS__) {
            expect(td.hasAttribute('data-darkreader-inline-bgcolor')).toBe(true);
            expect(td.style.getPropertyValue('--darkreader-inline-bgcolor')).not.toBe('');
        }
    });

    it('should override inline style with unformatted values', () => {
        container.innerHTML = '<span style="color:rgb(255,0,0,.87)">Unformatted inline style</span>';
        createOrUpdateDynamicTheme(theme, null, false);
        const span = container.querySelector('span')!;
        expect(getComputedStyle(span).color).toBe('rgba(255, 26, 26, 0.87)');
    });

    it('should override inline value regardless of its position', () => {
        container.innerHTML = [
            '<span id="mid" style="font-size:10px;color:rgb(255,0,0,.87)">mid</span>',
            '<span id="start" style="color:rgb(255,0,0,.87)">start</span>',
        ].join('\n');
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('#mid')!).color).toBe('rgba(255, 26, 26, 0.87)');
        expect(getComputedStyle(container.querySelector('#start')!).color).toBe('rgba(255, 26, 26, 0.87)');
    });

    it('should override inline shorthand properties', () => {
        container.innerHTML = '<span style="border-color: red; border-style: solid; border-width: 1px">inline border shorthand</span>';
        createOrUpdateDynamicTheme(theme, null, false);
        const span = container.querySelector('span')!;
        expect(getComputedStyle(span).borderTopColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(span).borderBottomColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(span).borderLeftColor).toBe('rgb(179, 0, 0)');
        expect(getComputedStyle(span).borderRightColor).toBe('rgb(179, 0, 0)');
    });

    it('should override inline styles after disabling and enabling', () => {
        container.innerHTML = '<span style="color: red;">Toggle inline style</span>';
        createOrUpdateDynamicTheme(theme, null, false);
        const span = container.querySelector('span')!;
        expect(getComputedStyle(span).color).toBe('rgb(255, 26, 26)');

        removeDynamicTheme();
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(span).color).toBe('rgb(255, 26, 26)');
    });

    it('should clean up the customProp after originial is gone', async () => {
        container.innerHTML = '<span style="color: red;">Watch inline style</span>';
        createOrUpdateDynamicTheme(theme, null, false);
        const span = document.querySelector('span')!;
        expect(getComputedStyle(span).color).toBe('rgb(255, 26, 26)');
        if (!__PLUS__) {
            expect(span.getAttribute('style')!.startsWith('color: red; --darkreader-inline-color:')).toBeTrue();
            expect(span.getAttribute('style')!.includes('--darkreader-inline-color: var(--darkreader-text-ff0000, #ff1a1a);')).toBe(true);
        }

        span.style.color = '';
        await timeout(0);
        expect(getComputedStyle(span).color).toBe('rgb(255, 255, 255)');
        if (!__PLUS__) {
            expect(span.getAttribute('style')).toBe('');
        }
    });

    it(`shouldn't touch rel="mask-icon"`, async () => {
        container.innerHTML = '<link rel="mask-icon" color="red">';
        createOrUpdateDynamicTheme(theme, null, false);

        const maskIcon = document.querySelector('link[rel="mask-icon"]')!;
        expect(maskIcon.getAttribute('style')).toBe(null);
    });

    it(`shouldn't touch a "none" value for fill`, async () => {
        container.innerHTML = `<svg> <rect width="100" height="100" fill="none" /></svg>`;
        container.innerHTML += `<style> rect[width][height] { fill: red }</style>`;
        createOrUpdateDynamicTheme(theme, null, false);

        const rect = container.querySelector('rect')!;
        expect(getComputedStyle(rect).fill).toBe('rgb(255, 26, 26)');
    });
});
