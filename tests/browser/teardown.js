// @ts-check
const server = require('./server');
const instances = require('./shared');

module.exports = async () => {
    await instances.browser.get().close();
    await server.close();
};
