// @ts-check

import {dirname} from 'path';
import {createRequire} from 'module';
const rootDir = dirname(createRequire(import.meta.url).resolve('../../package.json'));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    rootDir,
    testMatch: ['<rootDir>/tests/unit/**/*.tests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    transform: {'^.+\\.ts(x?)$': 'ts-jest'},
    globals: {
        'ts-jest': {tsconfig: '<rootDir>/tests/unit/tsconfig.json'},
        __FIREFOX__: false,
        __CHROMIUM_MV2__: false,
        __CHROMIUM_MV3__: false,
        __THUNDERBIRD__: false,
        __DEBUG__: false,
        __TEST__: true,
    },
    setupFilesAfterEnv: ['jest-extended/all'],
};

export default config;
