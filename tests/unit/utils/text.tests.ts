import {formatCSS} from '../../../src/utils/css-text/format-css';
import {getParenthesesRange} from '../../../src/utils/text';

test('CSS formatting', () => {
    expect(formatCSS('div { color: red; }'))
        .toEqual([
            'div {',
            '    color: red;',
            '}',
        ].join('\n'));

    expect(formatCSS('div { color: red; } .list-item { background: rgb(0, 0, 0); color: white; }'))
        .toEqual([
            'div {',
            '    color: red;',
            '}',
            '.list-item {',
            '    background: rgb(0, 0, 0);',
            '    color: white;',
            '}',
        ].join('\n'));

    expect(formatCSS('@media screen { div { color: red; } span { color: red; } } @media all { p { color: green; } }'))
        .toEqual([
            '@media screen {',
            '    div {',
            '        color: red;',
            '    }',
            '    span {',
            '        color: red;',
            '    }',
            '}',
            '@media all {',
            '    p {',
            '        color: green;',
            '    }',
            '}',
        ].join('\n'));

    expect(formatCSS('div, span { background: green; color: red; }'))
        .toEqual([
            'div,',
            'span {',
            '    background: green;',
            '    color: red;',
            '}',
        ].join('\n'));

    expect(formatCSS('@media print, screen and (min-width: 20rem) { div, span { background: green; color: red; } }'))
        .toEqual([
            '@media print, screen and (min-width: 20rem) {',
            '    div,',
            '    span {',
            '        background: green;',
            '        color: red;',
            '    }',
            '}',
        ].join('\n'));

    expect(formatCSS('.icon { background-image: url(data:image/gif;base64,XYZ); }'))
        .toEqual([
            '.icon {',
            '    background-image: url(data:image/gif;base64,XYZ);',
            '}',
        ].join('\n'));

    expect(formatCSS('img[src*="a,b;c"] { filter: invert(1); }'))
        .toEqual([
            'img[src*="a,b;c"] {',
            '    filter: invert(1);',
            '}',
        ].join('\n'));

    expect(formatCSS('img[src*="a,b;c"] {\n    filter: invert(1); \n}'))
        .toEqual([
            'img[src*="a,b;c"] {',
            '    filter: invert(1);',
            '}',
        ].join('\n'));

    expect(formatCSS('div { } span { color: red; } button { }'))
        .toEqual([
            'span {',
            '    color: red;',
            '}',
        ].join('\n'));

    expect(formatCSS('@media all { div { } span { color: red; } } @media all { div { } } @media all { button { color: green; } }'))
        .toEqual([
            '@media all {',
            '    span {',
            '        color: red;',
            '    }',
            '}',
            '@media all {',
            '    button {',
            '        color: green;',
            '    }',
            '}',
        ].join('\n'));
});

test('Parenthesis Range', () => {
    expect(getParenthesesRange('missing')).toBe(null);
    expect(getParenthesesRange('()')).toEqual({start: 0, end: 2});
    expect(getParenthesesRange('rgb(0, 0, 0)')).toEqual({start: 3, end: 12});
    expect(getParenthesesRange('rgb(0, 0, 0), rgb(0, 0, 0)')).toEqual({start: 3, end: 12});
    expect(getParenthesesRange('rgb(0, 0, 0), rgb(0, 0, 0)', 12)).toEqual({start: 17, end: 26});
    expect(getParenthesesRange('rgb(0, var(--x, var(--y)), 0)')).toEqual({start: 3, end: 29});
    expect(getParenthesesRange('rgb(0, var(--x, var(--y)), 0)', 4)).toEqual({start: 10, end: 25});
    expect(getParenthesesRange('rgb(0, var(--x, var(--y)), 0), rgb(0, 0, 0)')).toEqual({start: 3, end: 29});
});
