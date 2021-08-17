module.exports = {
    verbose: true,
    testEnvironment: 'jsdom',
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    testRegex: 'tests/generators/utils/.*\\.tests\\.ts$',
    moduleFileExtensions: [
        'ts',
        'js'
    ],
    rootDir: '../../../',
    collectCoverage: false,
    coverageDirectory: 'tests/coverage',
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
    ],
    globals: {
        'ts-jest': {
            tsconfig: './tests/generators/utils/tsconfig.json'
        }
    }
};
