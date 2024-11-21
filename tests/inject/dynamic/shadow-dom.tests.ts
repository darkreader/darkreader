import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {isFirefox, isSafari} from '../../../src/utils/platform';
import {multiline, timeout} from '../support/test-utils';

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

describe('SHADOW DOM', () => {
    it('should add static overrides', async () => {
        container.innerHTML = multiline(
            '<div class="shadow-dom-wrapper"></div>',
        );
        document.querySelector('.shadow-dom-wrapper').attachShadow({mode: 'open'});
        createOrUpdateDynamicTheme(theme, null, false);
        const shadowRoot = document.querySelector('.shadow-dom-wrapper').shadowRoot;
        expect(shadowRoot.firstElementChild.classList.contains('darkreader--inline')).toBe(true);
        expect(shadowRoot.firstElementChild.nextElementSibling.classList.contains('darkreader--override')).toBe(true);
        expect(shadowRoot.firstElementChild.nextElementSibling.nextElementSibling.classList.contains('darkreader--invert')).toBe(true);
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

        await timeout(0);
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

        await timeout(0);
        const shadowRoot = document.querySelector('.shadow-dom-wrapper').shadowRoot;
        expect(getComputedStyle(shadowRoot.querySelector('p')).color).toBe('rgb(255, 26, 26)');
    });

    it('should handle defined custom elements', async () => {
        container.innerHTML = multiline(
            '<custom-element>',
            '</custom-element>',
        );
        class CustomElement extends HTMLElement {
            constructor() {
                super();
                const shadowRoot = this.attachShadow({mode: 'open'});
                const style = document.createElement('style');
                style.textContent = 'p { color: pink }';
                const paragraph = document.createElement('p');
                paragraph.textContent = 'Some text content that should be pink.';

                shadowRoot.append(style);
                shadowRoot.append(paragraph);
            }
        }
        customElements.define('custom-element', CustomElement);

        createOrUpdateDynamicTheme(theme, null, false);
        const shadowRoot = document.querySelector('custom-element').shadowRoot;
        expect(getComputedStyle(shadowRoot.querySelector('p')).color).toBe('rgb(255, 198, 208)');
    });

    it('should react to defined custom elements', async () => {
        container.innerHTML = multiline(
            '<delayed-custom-element>',
            '</delayed-custom-element>',
        );
        class DelayedCustomElement extends HTMLElement {
            constructor() {
                super();
                const shadowRoot = this.attachShadow({mode: 'open'});
                const style = document.createElement('style');
                style.textContent = 'p { color: pink }';
                const paragraph = document.createElement('p');
                paragraph.textContent = 'Some text content that should be pink.';

                shadowRoot.append(style);
                shadowRoot.append(paragraph);
            }
        }

        createOrUpdateDynamicTheme(theme, null, false);
        customElements.define('delayed-custom-element', DelayedCustomElement);
        await timeout(0);
        const shadowRoot = document.querySelector('delayed-custom-element').shadowRoot;
        expect(getComputedStyle(shadowRoot.querySelector('p')).color).toBe('rgb(255, 198, 208)');
    });

    it('should override styles', async () => {
        // Firefox by default doesn't enable the CSSStyleSheet constructor.
        if (isFirefox || isSafari) {
            return;
        }

        container.innerHTML = multiline(
            '<div class="shadow-dom-wrapper"></div>',
        );

        const newRule = new CSSStyleSheet();
        newRule.insertRule(':host { --red: red }');

        const shadow = document.querySelector('.shadow-dom-wrapper').attachShadow({mode: 'open'});
        shadow.adoptedStyleSheets = [newRule];

        const style = document.createElement('style');
        style.classList.add('test-case-style');
        shadow.appendChild(style);
        style.sheet.insertRule('h1 { color: var(--red) }');

        const h1 = document.createElement('h1');
        shadow.appendChild(h1);

        createOrUpdateDynamicTheme(theme, null, false);

        const shadowRoot = document.querySelector('.shadow-dom-wrapper').shadowRoot;
        const testCase = shadowRoot.querySelector('.test-case-style');
        const darkendH1 = shadowRoot.querySelector('h1');
        expect(testCase.nextElementSibling.classList.contains('darkreader--sync')).toBe(true);
        expect((testCase.nextElementSibling as HTMLStyleElement).sheet.cssRules.length).toBe(1);
        expect(shadowRoot.adoptedStyleSheets.length).toBe(2);
        expect(getComputedStyle(darkendH1).color).toBe('rgb(255, 26, 26)');
    });
});
