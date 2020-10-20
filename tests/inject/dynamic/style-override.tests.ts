import '../polyfills';
import {createStyleSheetModifier} from '../../../src/inject/dynamic-theme/stylesheet-modifier';
import {DEFAULT_THEME} from '../../../src/defaults';

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
    container.innerHTML = '';
});

describe('Style override', () => {
    test('should override static style', () => {
        const style = document.createElement('style');
        style.textContent = 'body { background-color: white; } h1 { color: black; }';
        container.append(style);

        const modifier = createStyleSheetModifier();
        const override = new CSSStyleSheet();
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
        expect((override.cssRules[0] as CSSStyleRule).style.getPropertyValue('background-color')).toBe('#000000');
        expect((override.cssRules[1] as CSSStyleRule).selectorText).toBe('h1');
        expect((override.cssRules[1] as CSSStyleRule).style.getPropertyValue('color')).toBe('#ffffff');
    });
});
