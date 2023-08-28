// @ts-check

import {dirname} from 'node:path';
import {createRequire} from 'node:module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../../package.json'));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    rootDir,
    testMatch: ['<rootDir>/tests/project/**/*.tests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    transform: {
        '^.+\\.ts(x?)$': ['ts-jest', {tsconfig: '<rootDir>/tests/project/tsconfig.json'}],
        '/get-stream/': ['ts-jest'],
    },
    transformIgnorePatterns: [ '<rootDir>/node_modules/(?!(get-stream)/)'],
    globals: {
        __CHROMIUM_MV2__: true,
        __CHROMIUM_MV3__: false,
        __DEBUG__: false,
        __TEST__: true,
    },
    setupFilesAfterEnv: ['jest-extended/all'],
};

export default config;
