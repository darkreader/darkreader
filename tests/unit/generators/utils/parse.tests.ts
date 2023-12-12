import {indexSitesFixesConfig, getSitesFixesFor} from '../../../../src/generators/utils/parse';
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor<TestFix>('example.com', config, index, options);
    fixes.sort();
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesGeneric = getSitesFixesFor<TestFix>('example.com', config, index, options);
    const fixesInvalid = getSitesFixesFor<TestFix>('invalid.example', config, index, options);
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesFQD = getSitesFixesFor<TestFix>('example.com', config, index, options);
    const fixesWildcard = getSitesFixesFor<TestFix>('sub.example.net', config, index, options);
    fixesFQD.sort();
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'one',
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'two',
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'three',
        },
    ]);
    fixesWildcard.sort();
    expect(fixesWildcard).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'one',
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'two',
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesFQD = getSitesFixesFor<TestFix>('example.com', config, index, options);
    const fixesWildcard = getSitesFixesFor<TestFix>('sub.example.net', config, index, options);
    fixesFQD.sort();
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
    fixesWildcard.sort();
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesFQD = getSitesFixesFor<TestFix>('long.sub.example.com', config, index, options);
    expect(fixesFQD[0]).toEqual({
        'url': ['*'],
        'directive': 'hello world',
    });
    fixesFQD.sort();
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world',
        }, {
            'url': ['long.sub.example.com'],
            'directive': 'long',
        }, {
            'url': ['sub.example.com'],
            'directive': 'sub',
        }, {
            'url': ['*.example.com'],
            'directive': 'wildcard',
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor<TestFix>('www.example.com', config, index, options);
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

        const index = indexSitesFixesConfig<TestFix>(config);

        const fixes = getSitesFixesFor<TestFix>('www.example.com', config, index, options);
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

    test('Domain label in the wrong place', () => {
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
            'no match',
            '',
            '====================',
            '',
            '*.lowspecificity.com',
            '',
            'DIRECTIVE',
            'no match',
            '',
        ].join('\n');

        const index = indexSitesFixesConfig<TestFix>(config);

        const fixes = getSitesFixesFor<TestFix>('example.other.com', config, index, options);
        // Ensure that label 'example.com' does appear in the index
        expect(index.domainLabels).toEqual({
            '*': [0],
            'example.com': [1],
            'lowspecificity.com': [2],
        });
        expect(fixes).toEqual([{
            'url': ['*'],
            'directive': 'hello world',
        }]);
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor<TestFix>('www.example.com', config, index, options);
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
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor<TestFix>('www.example.com', config, index, options);
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
