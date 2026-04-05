import {readFile} from 'node:fs';

import type {StaticTheme, DetectorHint, InversionFix, DynamicThemeFix} from '../../../src/definitions';
import {parseInversionFixes, formatInversionFixes} from '../../../src/generators/css-filter';
import {parseDetectorHints, formatDetectorHints} from '../../../src/generators/detector-hints';
import {parseDynamicThemeFixes, formatDynamicThemeFixes} from '../../../src/generators/dynamic-theme';
import {parseStaticThemes, formatStaticThemes} from '../../../src/generators/static-theme';
import {parseColorSchemeConfig, type ParsedColorSchemeConfig} from '../../../src/utils/colorscheme-parser';
import {parseArray, formatArray, getTextDiffIndex, getTextPositionMessage} from '../../../src/utils/text';
import {compareURLPatterns} from '../../../src/utils/url';
import {multiline, rootPath} from '../../support/test-utils';

const commaSelector = /\,(?![^\(|\"]*(\)|\"))/;

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

expect.extend({
    toBeFormattedAs(received: string, expected: string) {
        const diffIndex = getTextDiffIndex(received, expected);
        if (diffIndex < 0) {
            return {pass: true, message: () => 'Strings are identical'};
        }
        return {
            pass: false,
            message: () => `Format mismatch:\n${getTextPositionMessage(received, diffIndex)}`,
        };
    },
});

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeFormattedAs(expected: string): R;
        }
    }
}

describe('parseDetectorHints', () => {
    test('Empty config returns empty array', () => {
        expect(parseDetectorHints('')).toEqual([]);
    });

    test('Single URL with TARGET and MATCH', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'TARGET', 'html',
            'MATCH', '[data-theme="dark"]',
        ))).toEqual([
            {url: ['example.com'], target: 'html', match: ['[data-theme="dark"]']},
        ]);
    });

    test('Multiple different domains share a single hint block', () => {
        expect(parseDetectorHints(multiline(
            'beta.alpha.com',
            'alpha.beta.com',
            'TARGET', 'a',
            'MATCH', '.b', '#c',
        ))).toEqual([
            {url: ['beta.alpha.com', 'alpha.beta.com'], target: 'a', match: ['.b', '#c']},
        ]);
    });

    test('Multiple different URLs share a single hint block', () => {
        expect(parseDetectorHints(multiline(
            'alpha.alpha.com',
            'beta.alpha.com',
            'TARGET', 'a',
            'MATCH', '.b', '#c',
        ))).toEqual([
            {url: ['alpha.alpha.com', 'beta.alpha.com'], target: 'a', match: ['.b', '#c']},
        ]);
    });

    test('Multiple hint blocks are parsed independently', () => {
        expect(parseDetectorHints(multiline(
            'alpha.com',
            'TARGET', 'a',
            'MATCH', '.b',
            '========',
            'beta.com',
            'TARGET', 'c',
            'MATCH', '.d',
        ))).toEqual([
            {url: ['alpha.com'], target: 'a', match: ['.b']},
            {url: ['beta.com'], target: 'c', match: ['.d']},
        ]);
    });

    test('SYSTEM THEME produces systemTheme:true, with no TARGET needed', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'SYSTEM THEME',
        ))).toEqual([
            {url: ['example.com'], systemTheme: true},
        ]);
    });

    test('NO DARK THEME produces noDarkTheme:true, with no TARGET', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'NO DARK THEME',
        ))).toEqual([
            {url: ['example.com'], noDarkTheme: true},
        ]);
    });

    test('IFRAME flag is captured alongside TARGET+MATCH', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'IFRAME',
            'TARGET', 'a',
            'MATCH', '.b',
        ))).toEqual([
            {url: ['example.com'], target: 'a', match: ['.b'], iframe: true},
        ]);
    });

    test('IFRAME flag is captured alongside SYSTEM THEME', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'SYSTEM THEME',
            'IFRAME',
        ))).toEqual([
            {url: ['example.com'], systemTheme: true, iframe: true},
        ]);
    });

    test('MATCH SYSTEM DARK and MATCH SYSTEM LIGHT parsed correctly', () => {
        expect(parseDetectorHints(multiline(
            'eff.org',
            'TARGET', 'a',
            'MATCH SYSTEM DARK', '.b',
            'MATCH SYSTEM LIGHT', '.c',
        ))).toEqual([
            {url: ['eff.org'], target: 'a', matchSystemDark: ['.b'], matchSystemLight: ['.c']},
        ]);
    });

    test('MATCH, MATCH SYSTEM DARK and MATCH SYSTEM LIGHT can coexist', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'TARGET', 'a',
            'MATCH', '.b',
            'MATCH SYSTEM DARK', '.c',
            'MATCH SYSTEM LIGHT', '.d',
        ))).toEqual([
            {
                url: ['example.com'],
                target: 'a',
                match: ['.b'],
                matchSystemDark: ['.c'],
                matchSystemLight: ['.d'],
            },
        ]);
    });

    test('Unsupported commands are silently skipped', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'TARGET', 'a',
            'UNSUPPORTED', 'x', 'y',
            'MATCH', '.b',
            '========',
            'other.com',
            'UNSUPPORTED', 'p', 'q',
            'TARGET', 'c',
            'MATCH', '[d="e"]',
        ))).toEqual([
            {url: ['example.com'], target: 'a', match: ['.b']},
            {url: ['other.com'], target: 'c', match: ['[d="e"]']},
        ]);
    });

    test('MATCH accepts multiple selectors', () => {
        expect(parseDetectorHints(multiline(
            'example.com',
            'TARGET', 'a',
            'MATCH', '.b', '.c', '#d',
        ))).toEqual([
            {url: ['example.com'], target: 'a', match: ['.b', '.c', '#d']},
        ]);
    });
});

describe('parseDynamicThemeFixes', () => {
    test('Empty config returns empty array', () => {
        expect(parseDynamicThemeFixes('')).toEqual([]);
    });

    test('Single entry with INVERT selectors', () => {
        expect(parseDynamicThemeFixes(multiline(
            'example.com',
            'INVERT', '.icon', '#logo',
        ))).toEqual([
            {url: ['example.com'], invert: ['.icon', '#logo']},
        ]);
    });

    test('CSS rule block is captured verbatim', () => {
        const fixes = parseDynamicThemeFixes(multiline(
            'example.com',
            'CSS', '.foo { color: white !important; }',
        ));
        expect(fixes[0].css).toBe('.foo { color: white !important; }');
    });

    test('IGNORE INLINE STYLE selectors are captured', () => {
        expect(parseDynamicThemeFixes(multiline(
            'example.org',
            'IGNORE INLINE STYLE', '.a', '.b',
        ))).toEqual([
            {url: ['example.org'], ignoreInlineStyle: ['.a', '.b']},
        ]);
    });

    test('IGNORE IMAGE ANALYSIS selectors are captured', () => {
        expect(parseDynamicThemeFixes(multiline(
            'example.com',
            'IGNORE IMAGE ANALYSIS', '.a', 'b',
        ))).toEqual([
            {url: ['example.com'], ignoreImageAnalysis: ['.a', 'b']},
        ]);
    });

    test('Multiple rules can coexist in one entry', () => {
        const fixes = parseDynamicThemeFixes(multiline(
            'example.com',
            'INVERT', '.icon',
            'CSS', '.foo { background: black !important; }',
            'IGNORE INLINE STYLE', '.picker',
            'IGNORE IMAGE ANALYSIS', '.banner',
        ));
        expect(fixes[0]).toMatchObject({
            url: ['example.com'],
            invert: ['.icon'],
            ignoreInlineStyle: ['.picker'],
            ignoreImageAnalysis: ['.banner'],
        });
        expect(fixes[0].css).toContain('background: black');
    });

    test('Multiple different domains share a single hint block', () => {
        const fixes = parseDynamicThemeFixes(multiline(
            'beta.alpha.com',
            'alpha.beta.com',
            'INVERT', 'a', 'b',
            'CSS', '.c { color: white !important; }',
        ));
        expect(fixes[0]).toEqual(
            {url: ['beta.alpha.com', 'alpha.beta.com'], invert: ['a', 'b'], css: '.c { color: white !important; }'},
        );
    });

    test('Multiple different URLs share a single hint block', () => {
        const fixes = parseDynamicThemeFixes(multiline(
            'alpha.alpha.com',
            'beta.alpha.com',
            'INVERT', 'a', 'b',
            'CSS', '.c { color: white !important; }',
        ));
        expect(fixes[0]).toEqual(
            {url: ['alpha.alpha.com', 'beta.alpha.com'], invert: ['a', 'b'], css: '.c { color: white !important; }'},
        );
    });

    test('Multiple separate entries are all parsed', () => {
        const fixes = parseDynamicThemeFixes(multiline(
            'alpha.com',
            'INVERT', 'c', 'd',
            '========',
            'beta.com',
            'IGNORE INLINE STYLE', 'a', 'b',
        ));
        expect(fixes).toHaveLength(2);
        expect(fixes[0].url).toEqual(['alpha.com']);
        expect(fixes[1].url).toEqual(['beta.com']);
    });

    test('Unsupported commands are silently skipped', () => {
        const fixes = parseDynamicThemeFixes(multiline(
            'example.com',
            'UNSUPPORTED', 'a', 'b',
            'INVERT', 'c', 'd',
        ));
        expect(fixes[0].invert).toEqual(['c', 'd']);
    });

    test('CSS with darkreader custom properties is captured', () => {
        const css = '.logo { background-color: var(--darkreader-neutral-background) !important; }';
        const fixes = parseDynamicThemeFixes(multiline(
            'example.com',
            'CSS', css,
        ));
        expect(fixes[0].css).toBe(css);
    });

    test('CSS with ${COLOR} template syntax is captured', () => {
        const css = '.btn { background-color: ${white} !important; }';
        const fixes = parseDynamicThemeFixes(multiline(
            'example.com',
            'CSS', css,
        ));
        expect(fixes[0].css).toBe(css);
    });
});

describe('parseInversionFixes', () => {
    test('Empty config returns empty array', () => {
        expect(parseInversionFixes('')).toEqual([]);
    });

    test('INVERT selectors are captured', () => {
        expect(parseInversionFixes(multiline(
            'example.com',
            'INVERT', '.icon', '.button', '#player',
        ))).toEqual([
            {url: ['example.com'], invert: ['.icon', '.button', '#player']},
        ]);
    });

    test('NO INVERT selectors are captured', () => {
        expect(parseInversionFixes(multiline(
            'example.com',
            'NO INVERT', '#player *',
        ))).toEqual([
            {url: ['example.com'], noinvert: ['#player *']},
        ]);
    });

    test('REMOVE BG selectors are captured', () => {
        expect(parseInversionFixes(multiline(
            'example.com',
            'REMOVE BG', '.bg-photo',
        ))).toEqual([
            {url: ['example.com'], removebg: ['.bg-photo']},
        ]);
    });

    test('CSS rule block is captured verbatim', () => {
        const fixes = parseInversionFixes(multiline(
            'example.com',
            'CSS', '.overlay { background: rgba(255, 255, 255, 0.5); }',
        ));
        expect(fixes[0].css).toBe('.overlay { background: rgba(255, 255, 255, 0.5); }');
    });

    test('All four rules coexist in one entry', () => {
        const fixes = parseInversionFixes(multiline(
            'example.com',
            'INVERT', '.icon', '.button', '#player',
            'NO INVERT', '#player *',
            'REMOVE BG', '.bg-photo',
            'CSS', '.overlay { background: rgba(255, 255, 255, 0.5); }',
        ));
        expect(fixes[0]).toMatchObject({
            url: ['example.com'],
            invert: ['.icon', '.button', '#player'],
            noinvert: ['#player *'],
            removebg: ['.bg-photo'],
        });
        expect(fixes[0].css).toContain('rgba(255, 255, 255, 0.5)');
    });

    test('Multiple separate entries are all parsed', () => {
        const fixes = parseInversionFixes(multiline(
            'foo.com',
            'INVERT', '.a',
            '========',
            'bar.com',
            'NO INVERT', '.b',
        ));
        expect(fixes).toHaveLength(2);
        expect(fixes[0].url).toEqual(['foo.com']);
        expect(fixes[1].url).toEqual(['bar.com']);
    });

    test('Multiple different domains share a single hint block', () => {
        const fixes = parseInversionFixes(multiline(
            'beta.alpha.com',
            'alpha.beta.com',
            'INVERT', 'a', 'b',
            'CSS', '.c { color: white !important; }',
        ));
        expect(fixes[0]).toEqual(
            {url: ['beta.alpha.com', 'alpha.beta.com'], invert: ['a', 'b'], css: '.c { color: white !important; }'},
        );
    });

    test('Multiple different URLs share a single hint block', () => {
        const fixes = parseInversionFixes(multiline(
            'alpha.alpha.com',
            'beta.alpha.com',
            'INVERT', 'a', 'b',
            'CSS', '.c { color: white !important; }',
        ));
        expect(fixes[0]).toEqual(
            {url: ['alpha.alpha.com', 'beta.alpha.com'], invert: ['a', 'b'], css: '.c { color: white !important; }'},
        );
    });

    test('Entry with only REMOVE BG and no other rules', () => {
        const fixes = parseInversionFixes(multiline(
            'example.com',
            'REMOVE BG', '.a',
        ));
        expect(fixes[0].removebg).toEqual(['.a']);
        expect(fixes[0].invert).toBeUndefined();
        expect(fixes[0].noinvert).toBeUndefined();
    });
});

describe('parseStaticThemes', () => {
    test('Empty config returns empty array', () => {
        expect(parseStaticThemes('')).toEqual([]);
    });

    test('Single entry with basic theme properties', () => {
        const themes = parseStaticThemes(multiline(
            'example.com',
            'NO COMMON',
        ));
        expect(themes[0].url).toEqual(['example.com']);
    });

    test('Multiple different domains share a single hint block', () => {
        const fixes = parseStaticThemes(multiline(
            'beta.alpha.com',
            'alpha.beta.com',
            'NO COMMON',
        ));
        expect(fixes[0]).toEqual(
            {url: ['beta.alpha.com', 'alpha.beta.com'], noCommon: true},
        );
    });

    test('Multiple different URLs share a single hint block', () => {
        const fixes = parseStaticThemes(multiline(
            'alpha.alpha.com',
            'beta.alpha.com',
            'NO COMMON',
        ));
        expect(fixes[0]).toEqual(
            {url: ['alpha.alpha.com', 'beta.alpha.com'], noCommon: true},
        );
    });

    test('Multiple separate theme entries are all parsed', () => {
        const themes = parseStaticThemes(multiline(
            'alpha.com',
            'NO COMMON',
            '========',
            'beta.com',
            'NO COMMON',
        ));
        expect(themes).toHaveLength(2);
        expect(themes[0].url).toEqual(['alpha.com']);
        expect(themes[1].url).toEqual(['beta.com']);
    });

    test('Last entry without trailing separator is still parsed', () => {
        const themes = parseStaticThemes(multiline(
            'example.com',
            'NO COMMON',
        ));
        expect(themes).toHaveLength(1);
        expect(themes[0].url).toEqual(['example.com']);
    });

    test('Subdomain-specific URL is preserved exactly', () => {
        const themes = parseStaticThemes(multiline(
            'app.example.com',
            'NO COMMON',
        ));
        expect(themes[0].url[0]).toBe('app.example.com');
    });
});

describe('parseColorSchemeConfig', () => {
    test('Parses a minimal DARK-only section', () => {
        const {result, error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3'
        ));
        expect(error).toBeNull();
        expect(result.dark['Default']).toBeDefined();
        expect(result.dark['Default'].backgroundColor).toBe('#181a1b');
        expect(result.dark['Default'].textColor).toBe('#e8e6e3');
        expect(result.light['Default']).toBeUndefined();
    });

    test('Parses a minimal LIGHT-only section', () => {
        const {result, error} = parseColorSchemeConfig(multiline(
            'Paper',
            '',
            'LIGHT',
            'background: #f5f5f0',
            'text: #222222',
        ));
        expect(error).toBeNull();
        expect(result.light['Paper']).toBeDefined();
        expect(result.dark['Paper']).toBeUndefined();
    });

    test('Parses a section with both DARK and LIGHT variants', () => {
        const {result, error} = parseColorSchemeConfig(multiline(
            'Nord',
            '',
            'DARK',
            'background: #2e3440',
            'text: #eceff4',
            '',
            'LIGHT',
            'background: #eceff4',
            'text: #3b4252',
        ));
        expect(error).toBeNull();
        expect(result.dark['Nord'].backgroundColor).toBe('#2e3440');
        expect(result.dark['Nord'].textColor).toBe('#eceff4');
        expect(result.light['Nord'].backgroundColor).toBe('#eceff4');
        expect(result.light['Nord'].textColor).toBe('#3b4252');
    });

    test('LIGHT-before-DARK order is stored correctly', () => {
        const {result, error} = parseColorSchemeConfig(multiline(
            'Inverted',
            '',
            'LIGHT',
            'background: #eceff4',
            'text: #3b4252',
            '',
            'DARK',
            'background: #2e3440',
            'text: #eceff4',
        ));
        expect(error).toBeNull();
        expect(result.light['Inverted'].backgroundColor).toBe('#eceff4');
        expect(result.dark['Inverted'].backgroundColor).toBe('#2e3440');
    });

    test('Accepts 3-character hex colors', () => {
        const {result, error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #1a1',
            'text: #eee',
            '',
            'LIGHT',
            'background: #fff',
            'text: #000',
        ));
        expect(error).toBeNull();
        expect(result.dark['Default'].backgroundColor).toBe('#1a1');
        expect(result.light['Default'].textColor).toBe('#000');
    });

    test('Parses two sections separated by the separator', () => {
        const {result, error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3',
            '',
            'LIGHT',
            'background: #ffffff',
            'text: #000000',
            '',
            '================================',
            '',
            'Dracula',
            '',
            'DARK',
            'background: #282b36',
            'text: #f8f8f2',
        ));
        expect(error).toBeNull();
        expect(result.dark['Default']).toBeDefined();
        expect(result.dark['Dracula']).toBeDefined();
        expect(result.dark['Dracula'].backgroundColor).toBe('#282b36');
    });

    test('All sections appear in result when there are three sections', () => {
        const {result, error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3',
            '',
            '================================',
            '',
            'Nord',
            '',
            'DARK',
            'background: #2e3440',
            'text: #eceff4',
            '',
            '================================',
            '',
            'Solarized',
            '',
            'DARK',
            'background: #002b36',
            'text: #93a1a1',
            '',
        ));
        expect(error).toBeNull();
        expect(Object.keys(result.dark)).toContain('Default');
        expect(Object.keys(result.dark)).toContain('Nord');
        expect(Object.keys(result.dark)).toContain('Solarized');
    });

    test('Returns an error for a duplicate section name', () => {
        const {error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3',
            '',
            '================================',
            '',
            'Default',
            '',
            'DARK',
            'background: #111111',
            'text: #eeeeee',
        ));
        expect(error).not.toBeNull();
    });

    test('Returns an error when the second line of a section is not empty', () => {
        const {error} = parseColorSchemeConfig(multiline(
            'Default',
            'unexpected content',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3',
        ));
        expect(error).not.toBeNull();
    });

    test('Returns an error when a two-variant section has extra trailing lines', () => {
        const {error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3',
            '',
            'LIGHT',
            'background: #ffffff',
            'text: #000000',
            '',
            'unexpected extra line',
        ));
        expect(error).not.toBeNull();
    });

    test('Returns an error when sections are out of alphabetical order', () => {
        const {error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3',
            '',
            '================================',
            '',
            'Zebra',
            '',
            'DARK',
            'background: #111111',
            'text: #eeeeee',
            '',
            '================================',
            '',
            'Alpha',
            '',
            'DARK',
            'background: #222222',
            'text: #dddddd',
        ));
        expect(error).not.toBeNull();
    });

    test('Returns only the first error (interrupt stops on duplicate before out-of-order)', () => {
        const {error} = parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e3',
            '',
            '================================',
            '',
            'Default',
            '',
            'DARK',
            'background: #111111',
            'text: #eeeeee',
            '',
            '================================',
            '',
            'Alpha',
            '',
            'DARK',
            'background: #222222',
            'text: #dddddd',
        ));
        expect(error).not.toBeNull();
        expect(typeof error).toBe('string');
    });

    test('Throws when the variant keyword line is empty', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
        ))).toThrow();
    });

    test('Throws when background property is absent (text comes first)', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'text: #e8e6e3',
        ))).toThrow();
    });

    test('Throws when text property line is empty', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
        ))).toThrow();
    });

    test('Throws when background hex color is too long (> 6 hex digits)', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b00',
            'text: #e8e6e3',
        ))).toThrow();
    });

    test('Throws when background hex color is too short (< 3 hex digits)', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #1a',
            'text: #e8e6e3',
        ))).toThrow();
    });

    test('Throws when background color is not a hex value', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: white',
            'text: #e8e6e3',
        ))).toThrow();
    });

    test('Throws when text hex color is invalid', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: notahex',
        ))).toThrow();
    });

    test('Throws when text hex color is too long', () => {
        expect(() => parseColorSchemeConfig(multiline(
            'Default',
            '',
            'DARK',
            'background: #181a1b',
            'text: #e8e6e300',
        ))).toThrow();
    });
});

describe('dark-sites.config', () => {
    let file: string;
    let sites: string[];

    beforeAll(async () => {
        file = await readConfig('dark-sites.config');
        sites = parseArray(file);
    });

    it('has no carriage returns', () => expect(file).not.toContain('\r'));
    it('has no trailing spaces', () => expect(file).not.toContain(' \n'));
    it('is not empty', () => expect(sites.length).toBeGreaterThan(0));
    it('has no protocol in URL patterns', () => expect(sites.every(isURLPatternValid)).toBe(true));
    it('is sorted alphabetically', () => expect(sites.slice().sort(compareURLPatterns)).toEqual(sites));
    it('is properly formatted', () => expect(file).toBeFormattedAs(formatArray(sites)));
});

describe('detector-hints.config', () => {
    let file: string;
    let hints: DetectorHint[];

    beforeAll(async () => {
        file = await readConfig('detector-hints.config');
        hints = parseDetectorHints(file);
    });

    it('has no carriage returns', () => expect(file).not.toContain('\r'));
    it('has no trailing spaces', () => expect(file).not.toContain(' \n'));
    it('is not empty', () => expect(hints.length).toBeGreaterThan(0));

    it('has valid URLs in each hint', () => {
        const offending = hints.find(({url}) => !url.every(isURLPatternValid));
        expect(offending).toBeUndefined();
    });

    it('is sorted alphabetically', () => expect(hints.map(({url}) => url[0])).toEqual(hints.map(({url}) => url[0]).sort(compareURLPatterns)));

    it('has no comma in selectors', () => {
        const offending = hints
            .flatMap(({target, match, matchSystemDark, matchSystemLight}) => [
                ...(target ? [target] : []),
                ...(match ?? []),
                ...(matchSystemDark ?? []),
                ...(matchSystemLight ?? []),
            ])
            .find((s) => commaSelector.test(s));
        expect(offending).toBeUndefined();
    });

    it('uses exactly one of NO DARK THEME, SYSTEM THEME, or TARGET', () => {
        const offending = hints.find(({noDarkTheme, systemTheme, target}) => {
            const modeCount = [noDarkTheme, systemTheme, target !== undefined].filter(Boolean).length;
            return modeCount !== 1;
        });
        expect(offending).toBeUndefined();
    });

    it('has TARGET paired with at least one of MATCH, MATCH SYSTEM DARK, or MATCH SYSTEM LIGHT', () => {
        const offending = hints.find(({target, match, matchSystemDark, matchSystemLight}) => {
            if (target === undefined) {
                return false;
            }
            return (match?.length ?? 0) === 0 &&
                (matchSystemDark?.length ?? 0) === 0 &&
                (matchSystemLight?.length ?? 0) === 0;
        });
        expect(offending).toBeUndefined();
    });

    it('has no MATCH rules combined with NO DARK THEME or SYSTEM THEME', () => {
        const offending = hints.find(({noDarkTheme, systemTheme, match, matchSystemDark, matchSystemLight}) => {
            if (!noDarkTheme && !systemTheme) {
                return false;
            }
            return Boolean(match || matchSystemDark || matchSystemLight);
        });
        expect(offending).toBeUndefined();
    });


    it('has single selector for target', () => {
        expect(hints.every(({target, noDarkTheme, systemTheme}) => noDarkTheme || systemTheme || typeof target === 'string' && !target.includes('\n'))).toBe(true);
    });

    it('has no empty rules', () => {
        const offending = hints.find(({match, matchSystemDark, matchSystemLight}) =>
            match?.length === 0 && matchSystemDark?.length === 0 && matchSystemLight?.length === 0
        );
        expect(offending).toBeUndefined();
    });

    it('is properly formatted', () => expect(file).toBeFormattedAs(formatDetectorHints(hints)));
});

describe('dynamic-theme-fixes.config', () => {
    let file: string;
    let fixes: DynamicThemeFix[];

    beforeAll(async () => {
        file = await readConfig('dynamic-theme-fixes.config');
        fixes = parseDynamicThemeFixes(file);
    });

    it('has no carriage returns', () => expect(file).not.toContain('\r'));
    it('has no trailing spaces', () => expect(file).not.toContain(' \n'));
    it('has a common fix', () => expect(fixes[0].url[0]).toEqual('*'));

    it('has valid URLs in each fix', () => {
        const offending = fixes.find(({url}) => !url.every(isURLPatternValid));
        expect(offending).toBeUndefined();
    });

    it('is sorted alphabetically', () => {
        const urls = fixes.map(({url}) => url[0]);
        expect(urls).toEqual([...urls].sort(compareURLPatterns));
    });

    it('has no comma in selectors', () => {
        const offending = fixes
            .flatMap(({invert, ignoreInlineStyle, ignoreImageAnalysis}) => [
                ...(invert ?? []),
                ...(ignoreInlineStyle ?? []),
                ...(ignoreImageAnalysis ?? []),
            ])
            .find((s) => commaSelector.test(s));
        expect(offending).toBeUndefined();
    });

    it('has no empty rules', () => {
        const offending = fixes.find(({invert, css, ignoreInlineStyle, ignoreImageAnalysis}) =>
            invert?.length === 0 ||
            css?.length === 0 ||
            ignoreInlineStyle?.length === 0 ||
            ignoreImageAnalysis?.length === 0
        );
        expect(offending).toBeUndefined();
    });

    it('is properly formatted', () => expect(file).toBeFormattedAs(formatDynamicThemeFixes(fixes)));
});

describe('inversion-fixes.config', () => {
    let file: string;
    let fixes: InversionFix[];

    beforeAll(async () => {
        file = await readConfig('inversion-fixes.config');
        fixes = parseInversionFixes(file);
    });

    it('has no carriage returns', () => expect(file).not.toContain('\r'));
    it('has no trailing spaces', () => expect(file).not.toContain(' \n'));
    it('has a common fix', () => expect(fixes[0].url[0]).toEqual('*'));

    it('has valid URLs in each fix', () => {
        const offending = fixes.find(({url}) => !url.every(isURLPatternValid));
        expect(offending).toBeUndefined();
    });

    it('is sorted alphabetically', () => {
        const urls = fixes.map(({url}) => url[0]);
        expect(urls).toEqual([...urls].sort(compareURLPatterns));
    });

    it('has no comma in selectors', () => {
        const offending = fixes
            .flatMap(({invert, noinvert, removebg}) => [
                ...(invert ?? []),
                ...(noinvert ?? []),
                ...(removebg ?? []),
            ])
            .find((s) => commaSelector.test(s));
        expect(offending).toBeUndefined();
    });

    it('has no empty rules', () => {
        const offending = fixes.find(({invert, noinvert, removebg, css}) =>
            invert?.length === 0 ||
            noinvert?.length === 0 ||
            removebg?.length === 0 ||
            css === ''
        );
        expect(offending).toBeUndefined();
    });

    it('is properly formatted', () => expect(file).toBeFormattedAs(formatInversionFixes(fixes)));
});

describe('static-themes.config', () => {
    let file: string;
    let themes: StaticTheme[];

    beforeAll(async () => {
        file = await readConfig('static-themes.config');
        themes = parseStaticThemes(file);
    });

    it('has no carriage returns', () => expect(file).not.toContain('\r'));
    it('has no trailing spaces', () => expect(file).not.toContain(' \n'));
    it('has a common theme', () => expect(themes[0].url[0]).toEqual('*'));

    it('has valid URLs in each theme', () => {
        const offending = themes.find(({url}) => !url.every(isURLPatternValid));
        expect(offending).toBeUndefined();
    });

    it('is sorted alphabetically', () => {
        const urls = themes.map(({url}) => url[0]);
        expect(urls).toEqual([...urls].sort(compareURLPatterns));
    });

    it('has no comma in selectors', () => {
        const offending = themes
            .flatMap((t) =>
                (Object.keys(t) as Array<keyof StaticTheme>)
                    .filter((prop) => !['url', 'noCommon'].includes(prop))
                    .flatMap((prop) => t[prop] as string[])
            )
            .find((s) => commaSelector.test(s));
        expect(offending).toBeUndefined();
    });

    it('is properly formatted', () => expect(file).toBeFormattedAs(formatStaticThemes(themes)));
});

describe('color-schemes.drconf', () => {
    let file: string;
    let schemes: ParsedColorSchemeConfig;

    beforeAll(async () => {
        file = await readConfig('color-schemes.drconf');
        const {result, error} = parseColorSchemeConfig(file);
        expect(error).toBeNull();
        schemes = result;
    });

    it('has no carriage returns', () => expect(file).not.toContain('\r'));
    it('has no trailing spaces', () => expect(file).not.toContain(' \n'));
    it('has a default Dark color scheme', () => expect(schemes.dark['Default']).toBeDefined());
    it('has a default Light color scheme', () => expect(schemes.light['Default']).toBeDefined());
    it('is properly formatted', () => expect(formatColorSchemeConfig(schemes)).toBe(file));
});
