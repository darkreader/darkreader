import type {DynamicThemeFix} from '../../../src/definitions';
import {findRelevantFix, combineFixes} from '../../../src/inject/dynamic-theme/fixes';
import {multiline} from '../../support/test-utils';

describe('Select fixes via findRelevantFix()', () => {
    const emptyFix: DynamicThemeFix = {
        url: [],
        css: '',
        invert: [],
        ignoreImageAnalysis: [],
        ignoreInlineStyle: [],
        ignoreCSSUrl: [],
        disableStyleSheetsProxy: false,
        disableCustomElementRegistryProxy: false,
    };

    it('If fix list is empty or invalid, findRelevantFix() returns null', () => {
        expect(findRelevantFix('https://example.com', [])).toBe(null);
        expect(findRelevantFix('https://example.com', 1 as any)).toBe(null);
        expect(findRelevantFix('https://example.com', 'a' as any)).toBe(null);
        expect(findRelevantFix('https://example.com', {} as any)).toBe(null);
    });

    it('If no matching URL found, findRelevantFix() returns null', () => {
        expect(findRelevantFix('https://example.com', [
            {
                ...emptyFix,
                url: ['*'],
            },
        ])).toBe(null);

        expect(findRelevantFix('https://example.com', [
            {
                ...emptyFix,
                url: ['*'],
            },
            {
                ...emptyFix,
                url: [
                    'other.com',
                    'some.net',
                ],
            },
        ])).toBe(null);

        expect(findRelevantFix('https://example.com', [
            {
                ...emptyFix,
                url: ['*'],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/sub',
                ],
            },
        ])).toBe(null);
    });

    it('If multiple matching URL patterns found, select the most specific one', () => {
        expect(findRelevantFix('https://example.com/sub', [
            {
                ...emptyFix,
                url: ['*'],
            },
            {
                ...emptyFix,
                url: [
                    'example.com',
                    'example.net',
                ],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/sub',
                    'some.net',
                ],
            },
        ])).toBe(2);

        expect(findRelevantFix('https://example.com/1/2/3', [
            {
                ...emptyFix,
                url: ['*'],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/1',
                    'example.net',
                ],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/1/2',
                    'example.net',
                ],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/1/2/3',
                    'some.net',
                ],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/1/2/3/4',
                    'some.net',
                ],
            },
        ])).toBe(3);
    });

    it('BUG COMPATIBILITY: If multiple matching URL patterns found, the most specific fix is determined by the length of first pattern', () => {
        expect(findRelevantFix('https://example.com/exact/match', [
            {
                ...emptyFix,
                url: ['*'],
            },
            {
                ...emptyFix,
                url: [
                    'other.net',
                    'example.com/exact/match',
                ],
            },
            {
                ...emptyFix,
                url: [
                    'other.net/this/fix/is/selected',
                    'example.com',
                ],
            },
            {
                ...emptyFix,
                url: [
                    'other.net',
                    'example.com/exact/match',
                ],
            },
        ])).toBe(2);
    });

    it('BUG COMPATIBILITY: If multiple matching URL patterns of the same length are found, select the first one', () => {
        expect(findRelevantFix('https://example.com/exact/match', [
            {
                ...emptyFix,
                url: ['*'],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/exact/match',
                ],
            },
            {
                ...emptyFix,
                url: [
                    'example.com/exact/match',
                ],
            },
        ])).toBe(1);
    });
});

describe('Construct single fix via combineFixes()', () => {
    const emptyFix: DynamicThemeFix = {
        url: [],
        css: '',
        invert: [],
        ignoreImageAnalysis: [],
        ignoreInlineStyle: [],
        ignoreCSSUrl: [],
        disableStyleSheetsProxy: false,
        disableCustomElementRegistryProxy: false,
    };

    it('Merges CSS', () => {
        expect(combineFixes([
            {
                ...emptyFix,
                url: ['*'],
                css: 'body { background: blue; }',
            },
            {
                ...emptyFix,
                url: ['example.com'],
                css: 'h1 { color: yellow; }\n',
            },
        ])!.css).toBe(multiline(
            'body { background: blue; }',
            'h1 { color: yellow; }',
        ));
    });

    it('Merges invert', () => {
        expect(combineFixes([
            {
                ...emptyFix,
                url: ['*'],
                invert: ['img'],
            },
            {
                ...emptyFix,
                invert: ['svg'],
            },
        ])!.invert).toStrictEqual(['img', 'svg']);
    });

    it('Merges ignoreImageAnalysis', () => {
        expect(combineFixes([
            {
                ...emptyFix,
                url: ['*'],
                ignoreImageAnalysis: ['img'],
            },
            {
                ...emptyFix,
                ignoreImageAnalysis: ['svg'],
            },
        ])!.ignoreImageAnalysis).toStrictEqual(['img', 'svg']);
    });

    it('Merges ignoreInlineStyle', () => {
        expect(combineFixes([
            {
                ...emptyFix,
                url: ['*'],
                ignoreInlineStyle: ['img'],
            },
            {
                ...emptyFix,
                ignoreInlineStyle: ['svg'],
            },
        ])!.ignoreInlineStyle).toStrictEqual(['img', 'svg']);
    });

    it('disableStyleSheetsProxy is true if it is true in at least one fix', () => {
        expect(combineFixes([
            {
                ...emptyFix,
                url: ['*'],
                disableStyleSheetsProxy: false,
            },
            {
                ...emptyFix,
            },
        ])!.disableStyleSheetsProxy).toBe(false);

        expect(combineFixes([
            {
                ...emptyFix,
                url: ['*'],
                disableStyleSheetsProxy: false,
            },
            {
                ...emptyFix,
                disableStyleSheetsProxy: true,
            },
            {
                ...emptyFix,
                disableStyleSheetsProxy: false,
            },
        ])!.disableStyleSheetsProxy).toBe(true);
    });
});
