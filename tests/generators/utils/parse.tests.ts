import {indexSitesFixesConfig, getSitesFixesFor} from '../../../src/generators/utils/parse';

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

    const options = {
        commands: ['DIRECTIVE1', 'MULTILINEDIRECTIVE'],
        getCommandPropName: (command) => command,
        parseCommandValue: (_, value) => value.trim(),
    };
    const index = indexSitesFixesConfig(config);

    const fixes = getSitesFixesFor('example.com', null, config, index, options);
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
