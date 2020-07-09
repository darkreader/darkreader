import {getAbsoluteURL} from '../../src/inject/dynamic-theme/url';
import {replaceCSSVariables} from '../../src/inject/dynamic-theme/css-rules';

test('Absolute URL', () => {
    expect(getAbsoluteURL('https://www.google.com', 'image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('//www.google.com', '/image.jpg')).toBe(`${location.protocol}//www.google.com/image.jpg`);
    expect(getAbsoluteURL('https://www.google.com', 'image.jpg?size=128')).toBe('https://www.google.com/image.jpg?size=128');
    expect(getAbsoluteURL('https://www.google.com/path', 'image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path', '../image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path/', '../image.jpg')).toBe('https://www.google.com/long/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/long/path/', '../another/image.jpg')).toBe('https://www.google.com/long/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', '/image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '//www.google.com/path/image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', '//www.google.com/path/../another/image.jpg')).toBe('https://www.google.com/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com', 'https://www.google.com/path/../another/image.jpg')).toBe('https://www.google.com/another/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', 'image.jpg')).toBe('https://www.google.com/path/image.jpg');
    expect(getAbsoluteURL('https://www.google.com/path/page.html', '../image.jpg')).toBe('https://www.google.com/image.jpg');
    expect(getAbsoluteURL('path/index.html', 'image.jpg')).toBe(`${location.origin}/path/image.jpg`);
    expect(getAbsoluteURL('path/index.html', '/image.jpg?size=128')).toBe(`${location.origin}/image.jpg?size=128`);
});

test('Replace CSS variables', () => {
    expect(
        replaceCSSVariables(
            'body { background: var(--bg); color: var(--text); }',
            new Map(),
        )
    ).toBe('body { background: var(--bg); color: var(--text); }');

    expect(
        replaceCSSVariables(
            'body { background: var(--bg); color: var(--text); } h1 { color: var(--text); }',
            new Map([['--bg', 'white'], ['--text', 'black']]),
        )
    ).toBe('body { background: white; color: black; } h1 { color: black; }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text, red); }',
            new Map([['--text', 'black']]),
        )
    ).toBe('body { color: black; }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text, red); }',
            new Map(),
        )
    ).toBe('body { color: red; }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text, var(--alert)); }',
            new Map([['--alert', 'red']]),
        )
    ).toBe('body { color: red; }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text, var(--alert, green)); }',
            new Map(),
        )
    ).toBe('body { color: green; }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text); }',
            new Map([['--text', 'var(--text)']]),
        )
    ).toBe('body { color: var(--text); }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text); }',
            new Map([['--text', 'var(--alert)'], ['--alert', 'var(--text)']]),
        )
    ).toBe('body { color: var(--text); }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text, var(--alert)); } h1 { color: var(--text); }',
            new Map([['--text', 'var(--alert)'], ['--alert', 'var(--text)']]),
        )
    ).toBe('body { color: var(--text); } h1 { color: var(--text); }');

    expect(
        replaceCSSVariables(
            'body { color: var(--text); } h1 { color: var(--alert); }',
            new Map([['--text', 'var(--alert)'], ['--alert', 'red']]),
        )
    ).toBe('body { color: red; } h1 { color: red; }');
});
