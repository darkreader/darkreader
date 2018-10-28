module.exports = {
    verbose: true,
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts(x?)$': 'ts-jest'
    },
    testRegex: 'tests/.*\\.tests\\.ts(x?)$',
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
            tsConfig: './tests/tsconfig.json'
        }
    }
};
