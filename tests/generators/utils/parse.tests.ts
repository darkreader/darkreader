import {indexSitesFixesConfig, getSitesFixesFor} from '../../../src/generators/utils/parse';
import type {SitesFixesParserOptions} from '../../../src/generators/utils/parse';

test('Index config', () => {
    const record1 =
    '*\n' +
    '\n' +
    'DIRECTIVE\n' +
    'hi\n' +
    '\n' +
    'MULTILINEDIRECTIVE\n' +
    'hello\n' +
    'world\n';

    const record2 =
    'example.com\n' +
    '\n' +
    'CSS\n' +
    'div {\n' +
    '  color: green;\n' +
    '}\n';

    const config = `${record1}\
    \n\
    =====================\n\
    \n\
    ${record2}`;

    const options: SitesFixesParserOptions<any> = {
        commands: ['DIRECTIVE1', 'MULTILINEDIRECTIVE'],
        getCommandPropName: (command) => command,
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor('example.com', config, index, options);
    expect(fixes).toEqual([
        {
            'url': ['example.com'],
            'CSS': 'div {\n  color: green;\n}'
        }, {
            'url': ['*'],
            'DIRECTIVE': 'hi',
            'MULTILINEDIRECTIVE':
            'hello\nworld'
        }]);
});

test('Empty config', () => {
    const config =
    '*\n' +
    '\n' +
    'DIRECTIVE\n' +
    'hello world\n' +
    '\n' +
    '====================\n' +
    '\n' +
    'invalid.example\n' +
    '\n';

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
