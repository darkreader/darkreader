import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {isSafari} from '../../../src/utils/platform';
import {multiline, timeout} from '../../test-utils';
import {stubChromeRuntimeMessage, resetChromeRuntimeMessageStub, stubBackgroundFetchResponse} from '../background-stub';
import {getCSSEchoURL} from '../echo-client';

const theme = {
    ...DEFAULT_THEME,
    darkSchemeBackgroundColor: 'black',
    darkSchemeTextColor: 'white',
};
let container: HTMLElement;
const links: HTMLLinkElement[] = [];

function createStyleLink(href: string) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.classList.add('testcase--link');
    link.href = href;
    document.head.append(link);
    links.push(link);
    return link;
}

function createCorsLink(content: string) {
    const url = getCSSEchoURL(content);
    stubBackgroundFetchResponse(url, content);
    return createStyleLink(url);
}

beforeEach(() => {
    container = document.body;
    container.innerHTML = '';
    stubChromeRuntimeMessage();
});

afterEach(() => {
    removeDynamicTheme();
    container.innerHTML = '';
    links.forEach((l) => l.remove());
    links.splice(0);
    resetChromeRuntimeMessageStub();
});

describe('LINK STYLES', () => {
    it('should override same-origin link', async () => {
        createStyleLink(`data:text/css;utf8,${encodeURIComponent(multiline(
            'h1 { background: gray; }',
            'h1 strong { color: red; }',
        ))}`);
        container.innerHTML = multiline(
            '<h1>Link <strong>override</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(50);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should override cross-origin link', async () => {
        createCorsLink(multiline(
            'h1 { background: gray; }',
            'h1 strong { color: red; }',
        ));
        container.innerHTML = multiline(
            '<h1><strong>Cross-origin</strong> link override</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(50);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should override cross-origin imports in linked CSS', async () => {
        const importedCSS = 'h1 { background: gray; }';
        const importedURL = getCSSEchoURL(importedCSS);
        stubBackgroundFetchResponse(importedURL, importedCSS);
        createCorsLink(multiline(
            `@import "${importedURL}";`,
            'h1 strong { color: red; }',
        ));
        container.innerHTML = multiline(
            '<h1><strong>Cross-origin import</strong> link override</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(100);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should override cross-origin link that has already been loaded', async () => {
        createCorsLink(multiline(
            'h1 { background: gray; }',
            'h1 strong { color: red; }',
        ));
        container.innerHTML = multiline(
            '<h1>Loaded <strong>cross-origin</strong> link override</h1>',
        );

        await timeout(50);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(128, 128, 128)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(0, 0, 0)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 0, 0)');

        createOrUpdateDynamicTheme(theme, null, false);
        await timeout(50);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });

    it('should remove manager from disabled link', async () => {
        const link = createStyleLink(`data:text/css;utf8,${encodeURIComponent(multiline(
            'h1 { background: gray; }',
            'h1 strong { color: red; }',
        ))}`);
        container.innerHTML = multiline(
            '<h1>Link <strong>disabled</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(50);
        expect(document.querySelector('.testcase--link').nextElementSibling.classList.contains(isSafari ? 'darkreader--cors' : 'darkreader--sync')).toBe(true);
        link.disabled = true;
        await timeout(0);
        expect(document.querySelector('.testcase--link').nextElementSibling.classList.contains(isSafari ? 'darkreader--cors' : 'darkreader--sync')).toBe(false);
    });
    it("Shouldn't wait on link that won't be loaded", async () => {
        const link = createStyleLink(null);
        link.setAttribute('data-href', `data:text/css;utf8,${encodeURIComponent(multiline(
            'h1 { background: green !important; }',
            'h1 strong { color: orange !important; }',
        ))}`);
        container.innerHTML = multiline(
            '<style>',
            '   h1 { background: gray; }',
            '</style>',
            '<h1>Link <strong>loading with non-href attribute</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);

        await timeout(0);
        const h1 = document.querySelector('h1');
        expect(getComputedStyle(h1).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(document.querySelector('.darkreader--fallback').textContent).toBe('');
    });
});

