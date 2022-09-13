// @ts-check

const {dirname} = require('path');
const rootDir = dirname(require.resolve('../../package.json'));

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
    rootDir,
    testMatch: ['<rootDir>/tests/project/**/*.tests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    transform: {'^.+\\.ts(x?)$': ['ts-jest', {tsconfig: '<rootDir>/tests/project/tsconfig.json'}]},
    globals: {
        __CHROMIUM_MV2__: true,
        __CHROMIUM_MV3__: false,
        __DEBUG__: false,
        __TEST__: true,
    },
    setupFilesAfterEnv: ['jest-extended/all'],
};

module.exports = config;
