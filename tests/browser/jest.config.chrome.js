const jestConfig = require('./jest.config.shared');

module.exports = {
    ...jestConfig,
    globals: {
        ...jestConfig.globals,
        product: 'chrome',
    },
};
