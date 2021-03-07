import '../polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline, timeout} from '../../test-utils';
import type {DynamicThemeFix} from '../../../src/definitions';
import {removeNode} from '../../../src/inject/utils/dom';

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
    it('should invert selectors', async () => {
        container.innerHTML = multiline(
            '<div class="logo">Some logo</div>',
        );
        const fixes: DynamicThemeFix = {
            url: ['*'],
            invert: ['.logo'],
            css: '',
            ignoreInlineStyle: [],
            ignoreImageAnalysis: [],

        };
        createOrUpdateDynamicTheme(DEFAULT_THEME, fixes, false);
        expect(getComputedStyle(container.querySelector('.logo')).filter).toBe('invert(1) hue-rotate(180deg) contrast(0.9)');
    });

    it('should insert CSS', async () => {
        container.innerHTML = multiline(
            '<p class="text">Some text need to be red</p>',
        );
        const fixes: DynamicThemeFix = {
            url: ['*'],
            invert: [''],
            css: '.text { color: red }',
            ignoreInlineStyle: [],
            ignoreImageAnalysis: [],

        };
        createOrUpdateDynamicTheme(DEFAULT_THEME, fixes, false);
        expect(getComputedStyle(container.querySelector('.text')).color).toBe('rgb(255, 0, 0)');
    });

    it('should ignore inline style', async () => {
        container.innerHTML = multiline(
            '<p class="text" style="background-color: purple">Some text need to be red</p>',
        );
        const fixes: DynamicThemeFix = {
            url: ['*'],
            invert: [''],
            css: '',
            ignoreInlineStyle: ['.text'],
            ignoreImageAnalysis: [],

        };
        createOrUpdateDynamicTheme(DEFAULT_THEME, fixes, false);
        expect(getComputedStyle(container.querySelector('.text')).backgroundColor).toBe('rgb(128, 0, 128)');
    });

    it('should ignore styling when darkreader-lock detected', async () => {
        document.head.innerHTML = multiline(
            '<meta name="darkreader-lock"></meta>',
            '<style>',
            '    body {',
            '        background-color: pink !important;',
            '    }',
            '</style>',
        );
        createOrUpdateDynamicTheme(DEFAULT_THEME, null, false);
        await timeout(100);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(255, 192, 203)');
    });

    it('should ignore styling when delayed darkreader-lock detected', async () => {
        document.head.innerHTML = multiline(
            '<style>',
            '    body {',
            '        background-color: pink !important;',
            '    }',
            '</style>',
        );
        createOrUpdateDynamicTheme(DEFAULT_THEME, null, false);
        await timeout(100);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(89, 0, 16)');
        const metaElement: HTMLMetaElement = document.createElement('meta');
        metaElement.name = 'darkreader-lock';
        document.head.appendChild(metaElement);
        await timeout(100);
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(255, 192, 203)');
    });

});
