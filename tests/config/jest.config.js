module.exports = {
    verbose: true,
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': './tests/esbuild-transform.js'
    },
    testRegex: 'tests/config/.*\\.tests\\.ts$',
    moduleFileExtensions: [
        'ts',
        'js'
    ],
    rootDir: '../../',
};
