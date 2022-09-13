// @ts-check

import {dirname, join} from 'path';
import {createRequire} from 'module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../../package.json'));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    rootDir,
    testMatch: ['<rootDir>/tests/browser/**/*.tests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testEnvironment: '<rootDir>/tests/browser/environment.js',
    verbose: true,
    transform: {'^.+\\.ts(x?)$': ['ts-jest', {tsconfig: '<rootDir>/tests/browser/tsconfig.json'}]},
    globals: {
        __DEBUG__: false,
        __CHROMIUM_MV2__: true,
        __CHROMIUM_MV3__: false,
        __FIREFOX__: false,
        __THUNDERBIRD__: false,
        __TEST__: true,
        product: 'chrome',
    },
    setupFilesAfterEnv: ['jest-extended/all'],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}'],
    coveragePathIgnorePatterns: ['^.+\\.d\\.ts$'],
};

export default config;
