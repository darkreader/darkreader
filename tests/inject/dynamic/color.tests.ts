import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {multiline} from '../support/test-utils';

const theme = {
    ...DEFAULT_THEME,
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

describe('COLOR PARSING', () => {
    it('should modify RGBA', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background: rgb(245, 185, 124); }',
            '    h1 strong { color: rgb(34, 52, 34); }',
            '    body { background-color: rgba(51, 170, 51, .4); }',
            '</style>',
            '<h1>RGB <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(126, 68, 10)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(205, 200, 194)');
        expect(getComputedStyle(container).backgroundColor).toBe('rgba(41, 136, 41, 0.4)');
    });

    it('should modify HSL', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background: hsl(270,60%,70%); }',
            '    h1 strong { color: hsl(.75turn, 60%, 70%); }',
            '    body { background-color: hsl(4.71239rad, 60%, 70%); }',
            '</style>',
            '<h1>HSL <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(72, 29, 114)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(176, 129, 223)');
        expect(getComputedStyle(container).backgroundColor).toBe('rgb(72, 29, 114)');
    });

    it('should modify HSLA', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background: hsla(240, 100%, 50%, .7); }',
            '    h1 strong { color: hsla(240, 100%, 50%, 1); }',
            '    body { background-color: hsla(240, 100%, 50%, .05); }',
            '</style>',
            '<h1>HSLA <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgba(0, 0, 204, 0.7)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(51, 125, 255)');
        expect(getComputedStyle(container).backgroundColor).toBe('rgba(0, 0, 204, 0.05)');
    });

    it('should modify knownColors', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background: rebeccapurple; }',
            '    h1 strong { color: InfoBackground; }',
            '    body { background-color: transparent; }',
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(82, 41, 122)');
        expect(getComputedStyle(container.querySelector('h1 strong')).color).toBe('rgb(249, 250, 166)');
        expect(getComputedStyle(container).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('should handle calc(...) cases', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background-color: hsl(0, 0%, calc(95% - 3%)) }',
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(35, 38, 40)');
    });

    it('should handle gradient\'s cases with rgb(...) xx%', async () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background-image: -webkit-linear-gradient(bottom, rgb(255, 255, 255) 15%, rgb(246, 246, 245) 85%); }',
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toBe('-webkit-linear-gradient(bottom, rgb(24, 26, 27) 15%, rgb(29, 32, 33) 85%)');
    });

    it('should handle complex calc(...) cases', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background-color: rgb(calc(216.75 + 153 * .15), calc(216.75 + 205 * .15), calc(216.75 + 255 * .15)) }',
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundColor).toBe('rgb(28, 31, 32)');
    });

    it('should handle gradients with calc(...) cases', () => {
        container.innerHTML = multiline(
            '<style>',
            '    h1 { background-image: linear-gradient(rgb(249, 249, 251) calc(100% - 3px), transparent), linear-gradient(-90deg, rgb(255, 145, 0), rgb(241, 3, 102) 50%, rgb(97, 115, 255)) }',
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toBe('linear-gradient(rgb(27, 29, 30), calc(100% - 3px), rgba(0, 0, 0, 0)), linear-gradient(-90deg, rgb(204, 116, 0), rgb(193, 2, 82) 50%, rgb(0, 17, 146))');
    });
});
