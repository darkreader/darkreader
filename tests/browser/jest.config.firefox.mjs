import config from './jest.config.mjs';
config.globals.product = 'firefox';
config.globals.__CHROMIUM_MV2__ = false;
process.env.BROWSER_TEST_PRODUCT = 'firefox';
export default config;
