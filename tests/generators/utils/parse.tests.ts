import {indexSitesFixesConfig, getSitesFixesFor} from '../../../src/generators/utils/parse';
import type {SitesFixesParserOptions} from '../../../src/generators/utils/parse';

test('Index config', () => {
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

    const options: SitesFixesParserOptions<any> = {
        commands: ['DIRECTIVE1', 'MULTILINEDIRECTIVE'],
        getCommandPropName: (command) => command,
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor('example.com', config, index, options);
    expect(fixes).toEqual([
        {
            'url': ['*'],
            'DIRECTIVE': 'hi',
            'MULTILINEDIRECTIVE':
            'hello\nworld'
        }, {
            'url': ['example.com'],
            'CSS': 'div {\n  color: green;\n}'
        }]);
});

test('Empty config', () => {
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

    const options: SitesFixesParserOptions<any> = {
        commands: ['DIRECTIVE'],
        getCommandPropName: (command) => command,
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig(config);

    const fixesGeneric = getSitesFixesFor('example.com', config, index, options);
    const fixesInvalid = getSitesFixesFor('invalid.example', config, index, options);
    expect(fixesGeneric).toEqual([{
        'url': ['*'],
        'DIRECTIVE': 'hello world',
    }]);
    expect(fixesInvalid).toEqual(fixesGeneric);
});

test('Domain appearing in multiple records', () => {
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

    const options: SitesFixesParserOptions<any> = {
        commands: ['DIRECTIVE'],
        getCommandPropName: (command) => command,
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor('example.com', config, index, options);
    const fixesWildcard = getSitesFixesFor('sub.example.net', config, index, options);
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'DIRECTIVE': 'hello world'
        }, {
            'url': ['example.com', '*.example.net'],
            'DIRECTIVE': 'one'
        }, {
            'url': ['example.com', '*.example.net'],
            'DIRECTIVE': 'two'
        }, {
            'url': ['example.com', '*.example.net'],
            'DIRECTIVE': 'three'
        }]);
    expect(fixesWildcard).toEqual([
        {
            'url': ['*'],
            'DIRECTIVE': 'hello world'
        }, {
            'url': ['example.com', '*.example.net'],
            'DIRECTIVE': 'one'
        }, {
            'url': ['example.com', '*.example.net'],
            'DIRECTIVE': 'two'
        }, {
            'url': ['example.com', '*.example.net'],
            'DIRECTIVE': 'three'
        }]);
});

test('Domain appearing multiple times within the same record', () => {
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

    const options: SitesFixesParserOptions<any> = {
        commands: ['DIRECTIVE'],
        getCommandPropName: (command) => command,
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor('example.com', config, index, options);
    const fixesWildcard = getSitesFixesFor('sub.example.net', config, index, options);
    expect(fixesFQD).toEqual([
        {
            'url': ['*'],
            'DIRECTIVE': 'hello world'
        }, {
            'url': [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net'
            ],
            'DIRECTIVE': 'one'
        }]);
    expect(fixesWildcard).toEqual([
        {
            'url': ['*'],
            'DIRECTIVE': 'hello world'
        }, {
            'url': [
                'example.com',
                '*.example.net',
                'example.com',
                '*.example.net'
            ],
            'DIRECTIVE': 'one'
        }]);
});

test('The generic fix appears first', () => {
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

    const options: SitesFixesParserOptions<any> = {
        commands: ['DIRECTIVE'],
        getCommandPropName: (command) => command,
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig(config);

    const fixesFQD = getSitesFixesFor('long.sub.example.com', config, index, options);
    expect(fixesFQD).toEqual([
        {
            'url':['*'],
            'DIRECTIVE':'hello world'
        }, {
            'url':['*.example.com'],
            'DIRECTIVE':'wildcard'
        }, {
            'url':['long.sub.example.com'],
            'DIRECTIVE':'long'
        }]);
});
