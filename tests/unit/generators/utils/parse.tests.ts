import {indexSitesFixesConfig, getSitesFixesFor, parseSitesFixesConfig} from '../../../../src/generators/utils/parse';
import type {SitesFixesParserOptions} from '../../../../src/generators/utils/parse';

test('Index config', () => {
    interface TestFix {
        url: string[];
        directive?: string;
        multilineDirective?: string;
        css?: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
        MULTILINEDIRECTIVE: 'multilineDirective',
        CSS: 'css',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hi',
        '',
        'MULTILINEDIRECTIVE',
        'hello',
        'world',
        '',
        '==================',
        '',
        'example.com',
        '',
        'CSS',
        'div {',
        '  color: green;',
        '}',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hi',
            'multilineDirective':
                'hello\nworld',
        }, {
            'url': ['example.com'],
            'css': 'div {\n  color: green;\n}',
        }]);
});

test('Empty config', () => {
    interface TestFix {
        url: string[];
        directive: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hello world',
        '',
        '====================',
        '',
        'invalid.example',
        '',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixesGeneric = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    const fixesInvalid = getSitesFixesFor<TestFix>('https://invalid.example', config, index, parse);
    expect(fixesGeneric).toEqual([{
        'url': ['*'],
        'directive': 'hello world',
    }]);
    expect(fixesInvalid).toEqual(fixesGeneric);
});

test('Domain appearing in multiple records', () => {
    interface TestFix {
        url: string[];
        directive: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hello world',
        '',
        '====================',
        '',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'one',
        '',
        '====================',
        '',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'two',
        '',
        '====================',
        '',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'three',
        '',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    const fixesWildcard = getSitesFixesFor<TestFix>('https://sub.example.net', config, index, parse);
    // Only the last fix is used for the same domain
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'three',
        },
    ]);
    expect(fixesWildcard).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'three',
        }]);
});

test('Domain appearing multiple times within the same record', () => {
    interface TestFix {
        url: string[];
        directive: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hello world',
        '',
        '====================',
        '',
        'example.com',
        '*.example.net',
        'example.com',
        '*.example.net',
        '',
        'DIRECTIVE',
        'one',
        '',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor<TestFix>('https://example.com', config, index, parse);
    const fixesWildcard = getSitesFixesFor<TestFix>('https://sub.example.net', config, index, parse);
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net',
            ],
            'directive': 'one',
        },
    ]);
    expect(fixesWildcard).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net',
            ],
            'directive': 'one',
        },
    ]);
});

test('BACKWARDS COMPATIBILITY: The generic fix appears first', () => {
    interface TestFix {
        url: string[];
        directive: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hello world',
        '',
        '====================',
        '',
        '*.example.com',
        '',
        'DIRECTIVE',
        'wildcard',
        '',
        '====================',
        '',
        'sub.example.com',
        '',
        'DIRECTIVE',
        'sub',
        '',
        '====================',
        '',
        'long.sub.example.com',
        '',
        'DIRECTIVE',
        'long',
        '',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor<TestFix>('https://long.sub.example.com', config, index, parse);
    expect(fixesFQD[0]).toEqual({
        'url': ['*'],
        'directive': 'hello world',
    });
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': ['*.example.com'],
            'directive': 'wildcard',
        }, {
            'url': ['long.sub.example.com'],
            'directive': 'long',
        },
    ]);
});

test('Fixes appear only once', () => {
    interface TestFix {
        url: string[];
        directive: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hello world',
        '',
        '====================',
        '',
        '*.example.com',
        'www.example.com',
        '',
        'DIRECTIVE',
        'duplicate',
        '',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor<TestFix>('https://www.example.com', config, index, parse);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': [
                '*.example.com',
                'www.example.com',
            ],
            'directive': 'duplicate',
        },
    ]);
});

describe('Explicit wildcard domain patterns', () => {
    interface TestFix {
        url: string[];
        directive: string;
    }
    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
    };
    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    test('', () => {
        const config = [
            '*',
            '',
            'DIRECTIVE',
            'hello world',
            '',
            '====================',
            '',
            '*.example.com',
            '',
            'DIRECTIVE',
            'match',
            '',
        ].join('\n');

        const index = indexSitesFixesConfig(config);

        const fixes = getSitesFixesFor<TestFix>('https://www.example.com', config, index, parse);
        expect(fixes).toEqual([
            {
                'url': ['*'],
                'directive': 'hello world',
            }, {
                'url': [
                    '*.example.com',
                ],
                'directive': 'match',
            },
        ]);
    });
});

test('Implied wildcards', () => {
    interface TestFix {
        url: string[];
        directive: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hello world',
        '',
        '====================',
        '',
        'example.com',
        '',
        'DIRECTIVE',
        'one',
        '',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor('https://www.example.com', config, index, parse);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': [
                'example.com',
            ],
            'directive': 'one',
        },
    ]);
});

// Regression test which ensures parser properly splits blocks (ignores Base64 padding within CSS).
test('Base64 in CSS', () => {
    interface TestFix {
        url: string[];
        directive?: string;
        css?: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
        CSS: 'css',
    };

    const config = [
        '*',
        '',
        'DIRECTIVE',
        'hello world',
        '',
        '====================',
        '',
        'example.com',
        '',
        'CSS',
        '.CodeMirror-merge-r-deleted, .CodeMirror-merge-l-deleted {',
        "    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFklEQVQImWO84ePDwMCQ8uEDEwMMAAA1TAO4kytpLAAAAABJRU5ErkJggg==') !important;",
        '}',
        '',
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const parse = (text: string) => parseSitesFixesConfig(text, options);
    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor<TestFix>('https://www.example.com', config, index, parse);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': [
                'example.com',
            ],
            'css': [
                '.CodeMirror-merge-r-deleted, .CodeMirror-merge-l-deleted {',
                "    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAFklEQVQImWO84ePDwMCQ8uEDEwMMAAA1TAO4kytpLAAAAABJRU5ErkJggg==') !important;",
                '}',
            ].join('\n'),
        }]);
});
