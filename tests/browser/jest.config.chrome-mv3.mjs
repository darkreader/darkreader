import config from './jest.config.mjs';
config.globals.product = 'chrome-mv3';
config.globals.__CHROMIUM_MV2__ = false;
config.globals.__CHROMIUM_MV3__ = true;
process.env.BROWSER_TEST_PRODUCT = 'chrome-mv3';
export default config;
