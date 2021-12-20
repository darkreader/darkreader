import jestConfig from './jest.config.shared.js';

export default {
    ...jestConfig,
    globals: {
        ...jestConfig.globals,
        product: 'chrome',
    },
};
