import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline, timeout} from '../../test-utils';
import {stubChromeRuntimeMessage, resetChromeRuntimeMessageStub, stubBackgroundFetchResponse} from '../background-stub';

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
    link.href = href;
    document.head.append(link);
    links.push(link);
    return link;
}

function getEchoURL(content: string, type = 'text/plain') {
    return `http://localhost:9966/echo?${new URLSearchParams({type, content})}`;
}

function getCSSEchoURL(content: string) {
    return getEchoURL(content, 'text/css');
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

describe('Link override', () => {
    it('should override same-origin link', async () => {
        createStyleLink(`data:text/css;utf8,${encodeURIComponent(multiline(
            'h1 { background: gray; }',
            'h1 strong { color: red; }',
        ))}`);
        container.innerHTML = multiline(
            '<h1>Link <strong>override</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await timeout(100);
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
        await timeout(1000);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(102, 102, 102)');
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(255, 26, 26)');
    });
});
