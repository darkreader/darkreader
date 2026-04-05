import {indexSitesFixesConfig, getSitesFixesFor, parseSitesFixesConfig, type SitesFixesParserOptions} from '../../../../src/generators/utils/parse';
import {multiline} from '../../../support/test-utils';

interface TestFix {
    url: string[];
    directive?: string;
    multilineDirective?: string;
    css?: string;
}

const directiveMap: Record<string, keyof TestFix> = {
    DIRECTIVE: 'directive',
    MULTILINEDIRECTIVE: 'multilineDirective',
    CSS: 'css',
};

const options: SitesFixesParserOptions<TestFix> = {
    commands: Object.keys(directiveMap),
    getCommandPropName: (command) => directiveMap[command],
    parseCommandValue: (_, value) => value.trim(),
};

const parse = (text: string) => parseSitesFixesConfig(text, options);

const GENERIC_FIX_CONFIG = multiline('*', '', 'DIRECTIVE', 'hello world', '');
const GENERIC_FIX = {url: ['*'], directive: 'hello world'};
const SEPARATOR = '========';

test('Index config', () => {
    const config = multiline(GENERIC_FIX_CONFIG,
        'MULTILINEDIRECTIVE',
        'hello',
        'world',
        '',
        '========',
        '',
        'example.com',
        '',
        'CSS',
        'div {',
        '  color: green;',
        '}',
    );

    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    expect(fixes).toEqual([
        {
            ...GENERIC_FIX,
            multilineDirective:
                'hello\nworld',
        }, {
            url: ['example.com'],
            css: 'div {\n  color: green;\n}',
        }]);
});

test('Empty config', () => {
    const config = multiline(GENERIC_FIX_CONFIG, SEPARATOR, '',
        'invalid.example'
    );

    const index = indexSitesFixesConfig(config);

    const fixesGeneric = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    const fixesInvalid = getSitesFixesFor<TestFix>('https://invalid.example', config, index, parse);
    expect(fixesGeneric).toEqual([GENERIC_FIX]);
    expect(fixesInvalid).toEqual(fixesGeneric);
});

test('Domain appearing in multiple records', () => {
    const config = multiline(GENERIC_FIX_CONFIG, SEPARATOR, '',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'one',
        '',
        '========',
        '',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'two',
        '',
        '========',
        '',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'three'
    );

    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    const fixesWildcard = getSitesFixesFor<TestFix>('https://sub.example.net', config, index, parse);
    // Only the last fix is used for the same domain
    expect(fixesFQD).toEqual([
        GENERIC_FIX, {
            url: ['example.com', '*.example.net'],
            directive: 'three',
        },
    ]);
    expect(fixesWildcard).toEqual([
        GENERIC_FIX, {
            url: ['example.com', '*.example.net'],
            directive: 'three',
        }]);
});

test('Domain appearing multiple times within the same record', () => {
    const config = multiline(GENERIC_FIX_CONFIG, SEPARATOR, '',
        'example.com',
        '*.example.net',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'one'
    );

    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    const fixesWildcard = getSitesFixesFor<TestFix>('https://sub.example.net', config, index, parse);
    expect(fixesFQD).toEqual([
        GENERIC_FIX, {
            url: [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net',
            ],
            directive: 'one',
        },
    ]);
    expect(fixesWildcard).toEqual([
        GENERIC_FIX, {
            url: [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net',
            ],
            directive: 'one',
        },
    ]);
});

test('BACKWARDS COMPATIBILITY: The generic fix appears first', () => {
    const config = multiline(GENERIC_FIX_CONFIG, SEPARATOR, '',
        '*.example.com',
        '',
        'DIRECTIVE',
        'wildcard',
        '',
        '========',
        '',
        'sub.example.com',
        '',
        'DIRECTIVE',
        'sub',
        '',
        '========',
        '',
        'long.sub.example.com',
        '',
        'DIRECTIVE',
        'long'
    );

    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor<TestFix>('https://long.sub.example.com', config, index, parse);
    expect(fixesFQD[0]).toEqual({
        url: ['*'],
        directive: 'hello world',
    });
    expect(fixesFQD).toEqual([
        GENERIC_FIX, {
            url: ['*.example.com'],
            directive: 'wildcard',
        }, {
            url: ['long.sub.example.com'],
            directive: 'long',
        },
    ]);
});

test('Fixes appear only once', () => {
    const config = multiline(GENERIC_FIX_CONFIG, SEPARATOR, '',
        '*.example.com',
        'www.example.com',
        '',
        'DIRECTIVE',
        'duplicate'
    );

    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor<TestFix>('https://www.example.com', config, index, parse);
    expect(fixes).toEqual([
        {
            url: ['*'],
            directive: 'hello world',
        }, {
            url: [
                '*.example.com',
                'www.example.com',
            ],
            directive: 'duplicate',
        },
    ]);
});

test('Fixes for paths', () => {
    const config = multiline(GENERIC_FIX_CONFIG, SEPARATOR, '',
        'example.com',
        '',
        'DIRECTIVE',
        'no path',
        '',
        '========',
        '',
        'example.com/bar',
        '',
        'DIRECTIVE',
        'bar path',
        '',
        '========',
        '',
        'example.com/foo',
        '',
        'DIRECTIVE',
        'foo path',
        '',
        '========',
        '',
        'example.com/foo/quox',
        '',
        'DIRECTIVE',
        'foo/quox path'
    );

    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor<TestFix>('https://www.example.com/foo/quox', config, index, parse);
    expect(fixes).toEqual([
        GENERIC_FIX, {
            url: [
                'example.com',
            ],
            directive: 'no path',
        }, {
            url: [
                'example.com/foo',
            ],
            directive: 'foo path',
        }, {
            url: [
                'example.com/foo/quox',
            ],
            directive: 'foo/quox path',
        },
    ]);
});

// Regression test which ensures parser properly splits blocks (ignores Base64 padding within CSS).
test('Base64 in CSS', () => {
    const CODEMIRROR_CSS = [
        '.CodeMirror-merge-r-deleted, .CodeMirror-merge-l-deleted {',
        "    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFklEQVQImWO84ePDwMCQ8uEDEwMMAAA1TAO4kytpLAAAAABJRU5ErkJggg==') !important;",
        '}',
    ].join('\n');

    const config = multiline(GENERIC_FIX_CONFIG, SEPARATOR, '',
        'example.com',
        '',
        'CSS',
        CODEMIRROR_CSS,
    );

    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor<TestFix>('https://www.example.com', config, index, parse);
    expect(fixes).toEqual([
        GENERIC_FIX, {
            url: [
                'example.com',
            ],
            css: CODEMIRROR_CSS,
        }]);
});
