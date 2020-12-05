import '../polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline, timeout} from '../../test-utils';
import type {DynamicThemeFix} from '../../../src/definitions';

let container: HTMLElement;

beforeEach(() => {
    container = document.body;
    container.innerHTML = '';
});

afterEach(() => {
    removeDynamicTheme();
    container.innerHTML = '';
});

describe('Should handle different settings', () => {
    it('should invert', async () => {
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
        await timeout(100);
        expect(getComputedStyle(container.querySelector('.logo')).filter).toBe('invert(1) hue-rotate(180deg) contrast(0.9)');
    });
    it('should CSS', async () => {
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
        await timeout(100);
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
        await timeout(100);
        expect(getComputedStyle(container.querySelector('.text')).backgroundColor).toBe('rgb(102, 0, 102)');
    });

});
