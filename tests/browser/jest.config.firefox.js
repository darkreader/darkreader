const jestConfig = require('./jest.config');

module.exports = {
    ...jestConfig,
    globals: {
        ...jestConfig.globals,
        product: 'firefox',
    },
};
