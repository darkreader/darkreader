import '../polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline, timeout} from '../../test-utils';

const theme = {
    ...DEFAULT_THEME
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

describe('Should handle variables correctly', () => {

    it('should handle variables with different CSS Selectors', async () => {
        container.innerHTML = multiline(
            '<style>',
            '   .dark-theme {',
            '       --color: green;',
            '   }',
            '</style>',
            '<style>',
            '   .light-theme {',
            '       --color: red;',
            '   }',
            '</style>',
            '<style>',
            '   h1 {',
            '       color: var(--color)',
            '   }',
            '</style>',
            '<div class="dark-theme">',
            '    <h1>Dark <strong>Theme</strong>!</h1>',
            '</div>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await timeout(100);
        expect(getComputedStyle(container.querySelector('h1')).color).toBe('rgb(255, 26, 26)');
    });

});
