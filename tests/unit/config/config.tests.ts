import {readFile} from 'node:fs';

import type {StaticTheme} from '../../../src/definitions';
import {parseInversionFixes, formatInversionFixes} from '../../../src/generators/css-filter';
import {parseDetectorHints, formatDetectorHints} from '../../../src/generators/detector-hints';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../../../src/generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../../../src/generators/static-theme';
import {parseColorSchemeConfig} from '../../../src/utils/colorscheme-parser';
import type {ParsedColorSchemeConfig} from '../../../src/utils/colorscheme-parser';
import {parseArray, formatArray, getTextDiffIndex, getTextPositionMessage} from '../../../src/utils/text';
import {compareURLPatterns} from '../../../src/utils/url';
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

function formatColorSchemeConfig(scheme: ParsedColorSchemeConfig): string {
    const names = Object.keys(scheme.dark);
    const lines = [];
    for (const name of names) {
        lines.push(name);
        lines.push('');
        for (const color of ['dark', 'light']) {
            const style = scheme[color as keyof ParsedColorSchemeConfig][name];
            if (style) {
                const {backgroundColor, textColor} = style;
                lines.push(color.toUpperCase());
                if (backgroundColor) {
                    lines.push(`background: ${backgroundColor.toLowerCase()}`);
                }
                if (textColor) {
                    lines.push(`text: ${textColor.toLowerCase()}`);
                }
                lines.push('');
            }
        }
        lines.push('='.repeat(32));
        lines.push('');
    }
    lines.pop();
    lines.pop();
    return lines.join('\n');
}

test('Dark Sites list', async () => {
    const file = await readConfig('dark-sites.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    // there are no trailing spaces
    expect(file.indexOf(' \n')).toEqual(-1);

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

test('Detector Hints config', async () => {
    const file = await readConfig('detector-hints.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    // there are no trailing spaces
    expect(file.indexOf(' \n')).toEqual(-1);

    const hints = parseDetectorHints(file);

    // each hint has valid URL
    expect(hints.every(({url}) => url.every(isURLPatternValid))).toBe(true);

    // hints are sorted alphabetically
    expect(hints.map(({url}) => url[0])).toEqual(hints.map(({url}) => url[0]).sort(compareURLPatterns));

    // selectors should have no comma
    const commaSelector = /\,(?![^\(|\"]*(\)|\"))/;
    expect(hints.every(({target, match}) => ![target].concat(match).some((s) => commaSelector.test(s)))).toBe(true);

    // only a single selector is allowed for target
    expect(hints.every(({target, noDarkTheme, systemTheme}) => noDarkTheme || systemTheme || typeof target === 'string' && !target.includes('\n'))).toBe(true);

    // hints are properly formatted
    expect(throwIfDifferent(file, formatDetectorHints(hints), 'Detector Hints format error')).not.toThrow();

    // should parse empty config
    expect(parseDetectorHints('')).toEqual([]);

    // should skip unsupported commands
    expect(parseDetectorHints([
        'inbox.google.com',
        'mail.google.com',
        'TARGET', 'a',
        'MATCH', '.b', '#c',
        'UNSUPPORTED', 'c',
        '========',
        'proton.me',
        'SYSTEM THEME',
        '========',
        'twitter.com',
        'UNSUPPORTED', 'a', 'b',
        'TARGET', 'c',
        'MATCH', '[d="e"]',
        '========',
        'wikipedia.org',
        'NO DARK THEME',
    ].join('\n'))).toEqual([
        {url: ['inbox.google.com', 'mail.google.com'], target: 'a', match: ['.b', '#c']},
        {url: ['proton.me'], systemTheme: true},
        {url: ['twitter.com'], target: 'c', match: ['[d="e"]']},
        {url: ['wikipedia.org'], noDarkTheme: true},
    ] as any);
});

test('Dynamic Theme Fixes config', async () => {
    const file = await readConfig('dynamic-theme-fixes.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    // there are no trailing spaces
    expect(file.indexOf(' \n')).toEqual(-1);

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
    ] as any);
});

test('Inversion Fixes config', async () => {
    const file = await readConfig('inversion-fixes.config');

    // there is no \r character
    expect(file.indexOf('\r')).toEqual(-1);

    // there are no trailing spaces
    expect(file.indexOf(' \n')).toEqual(-1);

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

    // there are no trailing spaces
    expect(file.indexOf(' \n')).toEqual(-1);

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

    // there are no trailing spaces
    expect(file.indexOf(' \n')).toEqual(-1);

    const {result: schemes, error} = parseColorSchemeConfig(file);

    // Their is no error
    expect(error).toBeNull();

    // There is a default Dark color scheme
    expect(schemes.dark['Default']).toBeDefined();

    // There is a default Light color scheme
    expect(schemes.light['Default']).toBeDefined();

    // Check formatting
    expect(formatColorSchemeConfig(schemes)).toEqual(file);
});
