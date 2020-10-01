// @ts-check
const instances = require('./shared');
module.exports = async () => {
    await instances.browser.get().close();
};
