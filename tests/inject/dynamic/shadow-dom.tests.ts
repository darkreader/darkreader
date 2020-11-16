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
});

describe('Handle Shadow-DOM', () => {
    it('should add static overrides', async () => {
        container.innerHTML = multiline(
            '<div class="shadow-dom-wrapper"></div>',
        );
        document.querySelector('.shadow-dom-wrapper').attachShadow({mode: 'open'});
        createOrUpdateDynamicTheme(theme, null, false);
        const shadowRoot = document.querySelector('.shadow-dom-wrapper').shadowRoot;
        expect(shadowRoot.firstElementChild.classList.contains('darkreader--inline')).toBe(true);
        expect(shadowRoot.firstElementChild.nextElementSibling.classList.contains('darkreader--override')).toBe(true);
    });

    it('should override styles', async () => {
        container.innerHTML = multiline(
            '<div class="shadow-dom-wrapper"></div>',
        );
        const shadow = document.querySelector('.shadow-dom-wrapper').attachShadow({mode: 'open'});
        const style = document.createElement('style');
        style.classList.add('test-case-style');
        shadow.appendChild(style);
        style.sheet.insertRule('h1 { color: gray }');
        style.sheet.insertRule('strong { color: red }');
        createOrUpdateDynamicTheme(theme, null, false);

        const shadowRoot = document.querySelector('.shadow-dom-wrapper').shadowRoot;
        const testCase = shadowRoot.querySelector('.test-case-style');
        expect(testCase.nextElementSibling.classList.contains('darkreader--sync')).toBe(true);
        expect((testCase.nextElementSibling as HTMLStyleElement).sheet.cssRules.length).toBe(2);
    });

    it('should react to DOM changes', async () => {
        container.innerHTML = multiline(
            '<div class="shadow-dom-wrapper"></div>',
        );
        const shadow = document.querySelector('.shadow-dom-wrapper').attachShadow({mode: 'open'});

        createOrUpdateDynamicTheme(theme, null, false);
        const style = document.createElement('style');
        style.classList.add('test-case-style');
        shadow.appendChild(style);
        style.sheet.insertRule('h1 { color: gray }');
        style.sheet.insertRule('strong { color: red }');

        await timeout(100);
        const shadowRoot = document.querySelector('.shadow-dom-wrapper').shadowRoot;
        const testCase = shadowRoot.querySelector('.test-case-style');
        expect(shadowRoot.firstElementChild.classList.contains('darkreader--inline')).toBe(true);
        expect(shadowRoot.firstElementChild.nextElementSibling.classList.contains('darkreader--override')).toBe(true);
        expect(testCase.nextElementSibling.classList.contains('darkreader--sync')).toBe(true);
        expect((testCase.nextElementSibling as HTMLStyleElement).sheet.cssRules.length).toBe(2);
    });

    it('should override inline styles', async () => {
        container.innerHTML = multiline(
            '<div class="shadow-dom-wrapper"></div>',
        );
        const shadow = document.querySelector('.shadow-dom-wrapper').attachShadow({mode: 'open'});

        createOrUpdateDynamicTheme(theme, null, false);
        const standardElement = document.createElement('p');
        standardElement.style.color = 'red';
        shadow.appendChild(standardElement);

        await timeout(100);
        const shadowRoot = document.querySelector('.shadow-dom-wrapper').shadowRoot;
        expect(getComputedStyle(shadowRoot.querySelector('p')).color).toBe('rgb(255, 26, 26)');
    });

    it('should handle defined elements', async () => {
        container.innerHTML = multiline(
            '<svg-container>',
            '   <svg viewBox="0 0 100 30">',
            '       <style class="testcase-style">#svg-text { color: red; }</style>',
            '       <text id="svg-text" y="20">I am SVG</text>',
            '   </svg>',
            '</svg-container>',
        );
        class SVGContainer extends HTMLElement {
            constructor() {
                super();
                const shadowRoot = this.attachShadow({mode: 'open'});
                const style = document.createElement('style');
                style.textContent = 'p { color: pink }';
                const text = document.createElement('p');
                text.textContent = 'Some text content that should be pink.';

                shadowRoot.append(style);
                shadowRoot.append(text);
            }
        }
        customElements.define('svg-container', SVGContainer);

        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(100);
        const shadowRoot = document.querySelector('svg-container').shadowRoot;
        expect(getComputedStyle(shadowRoot.querySelector('p')).color).toBe('rgb(255, 198, 208)');
    });

    it('should react to defined elements', async () => {
        container.innerHTML = multiline(
            '<svg-container-2>',
            '   <svg viewBox="0 0 100 30">',
            '       <style class="testcase-style">#svg-text { color: red; }</style>',
            '       <text id="svg-text" y="20">I am SVG</text>',
            '   </svg>',
            '</svg-container2>',
        );
        class SVGContainer extends HTMLElement {
            constructor() {
                super();
                const shadowRoot = this.attachShadow({mode: 'open'});
                const style = document.createElement('style');
                style.textContent = 'p { color: pink }';
                const text = document.createElement('p');
                text.textContent = 'Some text content that should be pink.';

                shadowRoot.append(style);
                shadowRoot.append(text);
            }
        }

        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(100);
        customElements.define('svg-container-2', SVGContainer);
        await timeout(100);
        const shadowRoot = document.querySelector('svg-container-2').shadowRoot;
        expect(getComputedStyle(shadowRoot.querySelector('p')).color).toBe('rgb(255, 198, 208)');
    });

});
