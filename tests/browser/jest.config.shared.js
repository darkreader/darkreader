module.exports = {
    testEnvironment: './environment.js',
    verbose: true,
    transform: {
        '^.+\\.ts(x?)$': 'ts-jest'
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
        'ts-jest': {
            tsconfig: './tests/browser/tsconfig.json'
        },
        __DEBUG__: false,
    }
};
