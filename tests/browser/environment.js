// @ts-check
const JestNodeEnvironment = require('jest-environment-node');
const instances = require('./shared');

class PuppeteerEnvironment extends JestNodeEnvironment {
    constructor(config) {
        super(config);
    }

    async setup() {
        await super.setup();
        this.global.__BROWSER__ = instances.browser.get();
    }
}

module.exports = PuppeteerEnvironment;
