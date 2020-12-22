module.exports = {
    verbose: true,
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    testRegex: 'tests/config/.*\\.tests\\.ts$',
    moduleFileExtensions: [
        'ts',
        'js'
    ],
    rootDir: '../../',
    collectCoverage: false,
    coverageDirectory: 'tests/coverage',
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
    ],
    globals: {
        'ts-jest': {
            tsconfig: './tests/config/tsconfig.json'
        }
    }
};
