import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import type {DynamicThemeFix} from '../../../src/definitions';
import {FilterMode} from '../../../src/generators/css-filter';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {removeNode} from '../../../src/inject/utils/dom';
import {multiline, timeout} from '../support/test-utils';

let container: HTMLElement;

beforeEach(() => {
    container = document.body;
    container.innerHTML = '';
});

afterEach(() => {
    removeDynamicTheme();
    container.innerHTML = '';
    removeNode(document.head.querySelector('meta[name="darkreader-lock"]'));
});

describe('FIXES', () => {
    it('should add custom attributes to root element', () => {
        createOrUpdateDynamicTheme(DEFAULT_THEME, null, false);
        expect(document.documentElement.getAttribute(`data-darkreader-mode`)).toBe('dynamic');
        expect(document.documentElement.getAttribute('data-darkreader-scheme')).toBe('dark');

        createOrUpdateDynamicTheme({...DEFAULT_THEME, mode: FilterMode.light}, null, false);
        expect(document.documentElement.getAttribute('data-darkreader-scheme')).toBe('dimmed');
    });

    it('should invert selectors', async () => {
        container.innerHTML = multiline(
            '<div class="logo">Some logo</div>',
        );
        const fixes: DynamicThemeFix[] = [{
            url: ['*'],
            invert: ['.logo'],
            css: '',
            ignoreInlineStyle: [],
            ignoreImageAnalysis: [],
            ignoreCSSUrl: [],
            disableStyleSheetsProxy: false,
            disableCustomElementRegistryProxy: false,
        }];
        createOrUpdateDynamicTheme(DEFAULT_THEME, fixes, false);
        expect(getComputedStyle(container.querySelector('.logo')).filter).toBe('invert(1) hue-rotate(180deg) contrast(0.9)');
    });

    it('should insert CSS', async () => {
        container.innerHTML = multiline(
            '<p class="text">Some text need to be red</p>',
        );
        const fixes: DynamicThemeFix[] = [{
            url: ['*'],
            invert: [''],
            css: '.text { color: red }',
            ignoreInlineStyle: [],
            ignoreImageAnalysis: [],
            ignoreCSSUrl: [],
            disableStyleSheetsProxy: false,
            disableCustomElementRegistryProxy: false,
        }];
        createOrUpdateDynamicTheme(DEFAULT_THEME, fixes, false);
        expect(getComputedStyle(container.querySelector('.text')).color).toBe('rgb(255, 0, 0)');
    });

    it('should ignore inline style', async () => {
        container.innerHTML = multiline(
            '<p class="text" style="background-color: purple">Some text need to be red</p>',
        );
        const fixes: DynamicThemeFix[] = [{
            url: ['*'],
            invert: [''],
            css: '',
            ignoreInlineStyle: ['.text'],
            ignoreImageAnalysis: [],
            ignoreCSSUrl: [],
            disableStyleSheetsProxy: false,
            disableCustomElementRegistryProxy: false,
        }];
        createOrUpdateDynamicTheme(DEFAULT_THEME, fixes, false);
        expect(getComputedStyle(container.querySelector('.text')).backgroundColor).toBe('rgb(128, 0, 128)');
    });

    it('should ignore styling when darkreader-lock detected', async () => {
        document.head.innerHTML = '<meta name="darkreader-lock">',
        container.innerHTML = multiline(
            '<style>',
            '    body {',
            '        background-color: pink !important;',
            '    }',
            '</style>',
        );
        createOrUpdateDynamicTheme(DEFAULT_THEME, null, false);

        expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(255, 192, 203)');
    });

    it('should ignore styling when delayed darkreader-lock detected', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    body {',
            '        background-color: pink !important;',
            '    }',
            '</style>',
        );
        createOrUpdateDynamicTheme(DEFAULT_THEME, null, false);

        expect(getComputedStyle(container).backgroundColor).toBe('rgb(89, 0, 16)');
        const metaElement: HTMLMetaElement = document.createElement('meta');
        metaElement.name = 'darkreader-lock';
        document.head.appendChild(metaElement);
        await timeout(100);

        expect(getComputedStyle(container).backgroundColor).toBe('rgb(255, 192, 203)');
    });
});
