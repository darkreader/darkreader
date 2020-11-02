import '../polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {createStyleSheetModifier} from '../../../src/inject/dynamic-theme/stylesheet-modifier';
import {multiline} from '../../test-utils';

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

describe('Style override', () => {
    it('should fill CSSStyleSheet with overriden rules', () => {
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
            variables: new Map(),
            ignoreImageAnalysis: [],
            force: false,
            prepareSheet: () => override,
            isAsyncCancelled: () => false,
        });

        expect(override.cssRules.length).toBe(2);
        expect((override.cssRules[0] as CSSStyleRule).selectorText).toBe('body');
        expect((override.cssRules[0] as CSSStyleRule).style.getPropertyValue('background-color')).toBe('rgb(0, 0, 0)');
        expect((override.cssRules[1] as CSSStyleRule).selectorText).toBe('h1');
        expect((override.cssRules[1] as CSSStyleRule).style.getPropertyValue('color')).toBe('rgb(255, 255, 255)');
    });

    it('should override User Agent style', () => {
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

    it('should override static style', () => {
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
});
