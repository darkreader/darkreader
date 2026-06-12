// @ts-check

import {dirname} from 'node:path';
import {createRequire} from 'node:module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../../package.json'));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    rootDir,
    testMatch: ['<rootDir>/tests/browser/**/*.tests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testEnvironment: '<rootDir>/tests/browser/environment.js',
    globalSetup: '<rootDir>/tests/browser/global-setup.js',
    globalTeardown: '<rootDir>/tests/browser/global-teardown.js',
    testTimeout: Number(process.env.BROWSER_TEST_TIMEOUT_MS) || 120_000,
    // One browser per process; each test file uses a fresh environment.
    maxWorkers: 1,
    verbose: true,
    transform: {'^.+\\.ts(x?)$': ['ts-jest', {tsconfig: '<rootDir>/tests/browser/tsconfig.json'}]},
    globals: {
        __DEBUG__: false,
        __CHROMIUM_MV2__: false,
        __CHROMIUM_MV3__: true,
        __FIREFOX_MV2__: false,
        __THUNDERBIRD__: false,
        __TEST__: true,
        product: 'chrome-mv3',
    },
    setupFilesAfterEnv: ['jest-extended/all'],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['<rootDir>/src/**/*.{ts,tsx}'],
    coveragePathIgnorePatterns: ['^.+\\.d\\.ts$'],
};

export default config;
