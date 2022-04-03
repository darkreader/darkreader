import {readFile} from 'fs';
import {compareURLPatterns} from '../../../src/utils/url';
import {parseArray, formatArray, getTextDiffIndex, getTextPositionMessage} from '../../../src/utils/text';
import {parseInversionFixes, formatInversionFixes} from '../../../src/generators/css-filter';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../../../src/generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../../../src/generators/static-theme';
import type {StaticTheme} from '../../../src/definitions';
import {ParseColorSchemeConfig} from '../../../src/utils/colorscheme-parser';
import {rootPath} from '../../support/test-utils';

function readConfig(fileName: string) {
    return new Promise<string>((resolve, reject) => {
        readFile(rootPath('src/config', fileName), {encoding: 'utf-8'}, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

function isURLPatternValid(url: string) {
    return url.length > 0 && url.indexOf('://') < 0;
}

function throwIfDifferent(input: string, expected: string, message: string) {
    return () => {
        const diffIndex = getTextDiffIndex(input, expected);
        if (diffIndex >= 0) {
            throw new Error(`${message}\n${getTextPositionMessage(input, diffIndex)}`);
        }
    };
}

test('Dark Sites list', async () => {
    const file = await readConfig('dark-sites.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    const sites = parseArray(file);

    // is not empty
    expect(sites.length).toBeGreaterThan(0);

    // url patterns should have no protocol
    expect(sites.every(isURLPatternValid)).toBe(true);

    // sites are sorted alphabetically
    expect(sites.slice().sort(compareURLPatterns)).toEqual(sites);

    // sites are properly formatted
    expect(throwIfDifferent(file, formatArray(sites), 'Dark Sites list format error')).not.toThrow();
});

test('Dynamic Theme Fixes config', async () => {
    const file = await readConfig('dynamic-theme-fixes.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    const fixes = parseDynamicThemeFixes(file);

    // there is a common fix
    expect(fixes[0].url[0]).toEqual('*');

    // each fix has valid URL
    expect(fixes.every(({url}) => url.every(isURLPatternValid))).toBe(true);

    // fixes are sorted alphabetically
    expect(fixes.map(({url}) => url[0])).toEqual(fixes.map(({url}) => url[0]).sort(compareURLPatterns));

    // selectors should have no comma
    const commaSelector = /\,(?![^\(|\"]*(\)|\"))/;
    expect(fixes.every(({invert, ignoreInlineStyle, ignoreImageAnalysis}) => (invert || []).concat(ignoreInlineStyle || []).concat(ignoreImageAnalysis || []).every((s) => !commaSelector.test(s)))).toBe(true);

    // fixes are properly formatted
    expect(throwIfDifferent(file, formatDynamicThemeFixes(fixes), 'Dynamic fixes format error')).not.toThrow();

    // should parse empty config
    expect(parseDynamicThemeFixes('')).toEqual([]);

    // should skip unsupported commands
    expect(parseDynamicThemeFixes([
        'inbox.google.com',
        'mail.google.com',
        'INVERT', 'a', 'b',
        'CSS', '.x { color: white !important; }',
        'UNSUPPORTED', 'c', 'd',
        '========',
        'twitter.com',
        'UNSUPPORTED', 'a', 'b',
        'INVERT', 'c', 'd',
        '========',
        'wikipedia.org',
        'IGNORE INLINE STYLE', 'a', 'b',
        '========',
        'duckduckgo.com',
        'IGNORE IMAGE ANALYSIS', 'img[alt="Logo"]', 'canvas',
    ].join('\n'))).toEqual([
        {url: ['inbox.google.com', 'mail.google.com'], invert: ['a', 'b'], css: '.x { color: white !important; }'},
        {url: ['twitter.com'], invert: ['c', 'd']},
        {url: ['wikipedia.org'], ignoreInlineStyle: ['a', 'b']},
        {url: ['duckduckgo.com'], ignoreImageAnalysis: ['img[alt="Logo"]', 'canvas']},
    ]);
});

test('Inversion Fixes config', async () => {
    const file = await readConfig('inversion-fixes.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    const fixes = parseInversionFixes(file);

    // there is a common fix
    expect(fixes[0].url[0]).toEqual('*');

    // each fix has valid URL
    expect(fixes.every(({url}) => url.every(isURLPatternValid))).toBe(true);

    // fixes are sorted alphabetically
    expect(fixes.map(({url}) => url[0])).toEqual(fixes.map(({url}) => url[0]).sort(compareURLPatterns));

    // selectors should have no comma
    expect(fixes.every(({invert, noinvert, removebg}) => (invert || []).concat(noinvert || []).concat(removebg || []).every((s) => s.indexOf(',') < 0))).toBe(true);

    // fixes are properly formatted
    expect(throwIfDifferent(file, formatInversionFixes(fixes), 'Inversion fixes format error')).not.toThrow();
});

test('Static Themes config', async () => {
    const file = await readConfig('static-themes.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    const themes = parseStaticThemes(file);

    // there is a common theme
    expect(themes[0].url[0]).toEqual('*');

    // each theme has valid URL
    expect(themes.every(({url}) => url.every(isURLPatternValid))).toBe(true);

    // themes are sorted alphabetically
    expect(themes.map(({url}) => url[0])).toEqual(themes.map(({url}) => url[0]).sort(compareURLPatterns));

    // selectors should have no comma
    expect(themes.every((t) => (Object.keys(t) as Array<keyof StaticTheme>)
        .filter((prop) => ['url', 'noCommon'].indexOf(prop) < 0)
        .every((prop) => (t[prop] as string[])
            .every((s) => s.indexOf(',') < 0)))).toBe(true);

    // fixes are properly formatted
    expect(throwIfDifferent(file, formatStaticThemes(themes), 'Static theme format error')).not.toThrow();
});

test('Colorscheme config', async () => {
    const file = await readConfig('color-schemes.drconf');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    const {result: schemes, error} = ParseColorSchemeConfig(file);

    // Their is no error
    expect(error).toBeNull();

    // There is a default Dark color scheme
    expect(schemes.dark['Default']).toBeDefined();

    // There is a default Light color scheme
    expect(schemes.light['Default']).toBeDefined();
});
