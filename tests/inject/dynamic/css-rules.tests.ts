import {replaceCSSVariables} from '../../../src/inject/dynamic-theme/css-rules';

describe('Managing CSS rules', () => {
    it('should replace CSS variables', () => {
        expect(
            replaceCSSVariables(
                'body { background: var(--bg); color: var(--text); }',
                new Map(),
            ).result
        ).toBe('body { background: var(--bg); color: var(--text); }');

        expect(
            replaceCSSVariables(
                'body { background: var(--bg); color: var(--text); } h1 { color: var(--text); }',
                new Map([['--bg', 'white'], ['--text', 'black']]),
            ).result
        ).toBe('body { background: white; color: black; } h1 { color: black; }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text, red); }',
                new Map([['--text', 'black']]),
            ).result
        ).toBe('body { color: black; }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text, red); }',
                new Map(),
            ).result
        ).toBe('body { color: red; }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text, var(--alert)); }',
                new Map([['--alert', 'red']]),
            ).result
        ).toBe('body { color: red; }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text, var(--alert, green)); }',
                new Map(),
            ).result
        ).toBe('body { color: green; }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text); }',
                new Map([['--text', 'var(--text)']]),
            ).result
        ).toBe('body { color: var(--text); }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text); }',
                new Map([['--text', 'var(--alert)'], ['--alert', 'var(--text)']]),
            ).result
        ).toBe('body { color: var(--text); }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text, var(--alert)); } h1 { color: var(--text); }',
                new Map([['--text', 'var(--alert)'], ['--alert', 'var(--text)']]),
            ).result
        ).toBe('body { color: var(--text); } h1 { color: var(--text); }');

        expect(
            replaceCSSVariables(
                'body { color: var(--text); } h1 { color: var(--alert); }',
                new Map([['--text', 'var(--alert)'], ['--alert', 'red']]),
            ).result
        ).toBe('body { color: red; } h1 { color: red; }');
    });
});
