module.exports = {
    verbose: true,
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.ts$': './tests/esbuild-transform.js'
    },
    testRegex: 'tests/inject/.*\\.tests\\.ts$',
    moduleFileExtensions: [
        'ts',
        'js'
    ],
    rootDir: '../../',
    globals: {
        __DEBUG__: false,
    }
};
