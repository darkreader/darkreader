import config from './jest.config.mjs';
config.globals.product = 'firefox';
config.globals.__CHROMIUM_MV2__ = false;
export default config;
