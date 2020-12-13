module.exports = {
    verbose: true,
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.ts$': './tests/esbuild-transform.js'
    },
    testRegex: 'tests/utils/.*\\.tests\\.ts$',
    moduleFileExtensions: [
        'ts',
        'js'
    ],
    rootDir: '../../',
};
