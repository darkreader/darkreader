module.exports = {
    verbose: true,
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.ts(x?)$': 'ts-jest'
    },
    testRegex: 'tests/inject/.*\\.tests\\.ts(x?)$',
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
        'ts-jest': {
            tsConfig: './tests/inject/tsconfig.json'
        },
        __DEBUG__: false,
    }
};
