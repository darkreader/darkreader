import {indexSitesFixesConfig, getSitesFixesFor} from '../../../../src/generators/utils/parse';
import type {SitesFixesParserOptions} from '../../../../src/generators/utils/parse';

test('Index config', () => {
    interface TestFix {
        url: string[];
        directive: string[];
        multilineDirective: string[];
        css: string;
    }

    const directiveMap: { [key: string]: keyof TestFix } = {
        DIRECTIVE: 'directive',
        MULTILINEDIRECTIVE: 'multilineDirective',
        CSS: 'css'
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
        '}'
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor('example.com', config, index, options);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hi',
            'multilineDirective':
            'hello\nworld'
        }, {
            'url': ['example.com'],
            'css': 'div {\n  color: green;\n}'
        }]);
});

test('Empty config', () => {
    interface TestFix {
        url: string[];
        directive: string[];
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
        ''
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesGeneric = getSitesFixesFor('example.com', config, index, options);
    const fixesInvalid = getSitesFixesFor('invalid.example', config, index, options);
    expect(fixesGeneric).toEqual([{
        'url': ['*'],
        'directive': 'hello world',
    }]);
    expect(fixesInvalid).toEqual(fixesGeneric);
});

test('Domain appearing in multiple records', () => {
    interface TestFix {
        url: string[];
        directive: string[];
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
        ''
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesFQD = getSitesFixesFor('example.com', config, index, options);
    const fixesWildcard = getSitesFixesFor('sub.example.net', config, index, options);
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world'
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'one'
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'two'
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'three'
        }]);
    expect(fixesWildcard).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world'
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'one'
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'two'
        }, {
            'url': ['example.com', '*.example.net'],
            'directive': 'three'
        }]);
});

test('Domain appearing multiple times within the same record', () => {
    interface TestFix {
        url: string[];
        directive: string[];
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
        ''
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesFQD = getSitesFixesFor('example.com', config, index, options);
    const fixesWildcard = getSitesFixesFor('sub.example.net', config, index, options);
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world'
        }, {
            'url': [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net'
            ],
            'directive': 'one'
        }]);
    expect(fixesWildcard).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world'
        }, {
            'url': [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net'
            ],
            'directive': 'one'
        }]);
});

test('The generic fix appears first', () => {
    interface TestFix {
        url: string[];
        directive: string[];
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
        ''
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixesFQD = getSitesFixesFor('long.sub.example.com', config, index, options);
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'directive':'hello world'
        }, {
            'url': ['*.example.com'],
            'directive':'wildcard'
        }, {
            'url': ['long.sub.example.com'],
            'directive':'long'
        }, {
            'url': ['sub.example.com'],
            'directive':'sub'
        }]);
});

test('Fixes appear only once', () => {
    interface TestFix {
        url: string[];
        directive: string[];
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
        ''
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor('www.example.com', config, index, options);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world'
        }, {
            'url': [
                '*.example.com',
                'www.example.com'
            ],
            'directive': 'duplicate'
        }]);
});

test('Implied wildcards', () => {
    interface TestFix {
        url: string[];
        directive: string[];
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
        ''
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor('www.example.com', config, index, options);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world'
        }, {
            'url': [
                'example.com',
            ],
            'directive': 'one'
        }]);
});

// Regression test which ensures parser properly splits blocks (ignores Base64 padding within CSS).
test('Base64 in CSS', () => {
    interface TestFix {
        url: string[];
        directive: string[];
        css: string[];
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
        ''
    ].join('\n');

    const options: SitesFixesParserOptions<TestFix> = {
        commands: Object.keys(directiveMap),
        getCommandPropName: (command) => directiveMap[command],
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig<TestFix>(config);

    const fixes = getSitesFixesFor('www.example.com', config, index, options);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'directive': 'hello world'
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
