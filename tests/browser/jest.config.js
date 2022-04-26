// @ts-check

const {dirname} = require('path');
const rootDir = dirname(require.resolve('../../package.json'));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    rootDir,
    testMatch: ['<rootDir>/tests/browser/**/*.tests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testEnvironment: '<rootDir>/tests/browser/environment.js',
    verbose: true,
    transform: {'^.+\\.ts(x?)$': 'ts-jest'},
    globals: {
        'ts-jest': {tsconfig: '<rootDir>/tests/browser/tsconfig.json'},
        __DEBUG__: false,
        __TEST__: true,
        product: 'chrome',
    },
    setupFilesAfterEnv: ['jest-extended/all'],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}'],
    coveragePathIgnorePatterns: ['^.+\\.d\\.ts$'],
};

module.exports = config;
