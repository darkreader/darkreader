import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline, timeout} from '../../test-utils';

const theme = {
    ...DEFAULT_THEME,
    darkSchemeBackgroundColor: 'black',
    darkSchemeTextColor: 'white',
};
let container: HTMLElement;
const links: Array<HTMLLinkElement> = [];

function createStyleLink(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
    return link;
}


beforeEach(() => {
    container = document.body;
    container.innerHTML = '';
});

afterEach(() => {
    removeDynamicTheme();
    container.innerHTML = '';
    links.forEach((l) => l.remove());
    links.splice(0);
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
});
