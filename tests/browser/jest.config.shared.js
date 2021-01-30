module.exports = {
    testEnvironment: './tests/browser/environment.js',
    verbose: true,
    transform: {
        '^.+\\.ts(x?)$': './tests/esbuild-transform.js'
    },
    testRegex: 'tests/browser/.*\\.tests\\.ts(x?)$',
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js'
    ],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}'
    ],
    coveragePathIgnorePatterns: [
        '^.+\\.d\\.ts$'
    ],
    globals: {
        __DEBUG__: false,
    },
    rootDir: '../../',
};
