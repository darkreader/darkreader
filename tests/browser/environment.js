// @ts-check
const JestNodeEnvironment = require('jest-environment-node');
const puppeteer = require('puppeteer-core');
const {getChromePath} = require('./paths');
const server = require('./server');

class PuppeteerEnvironment extends JestNodeEnvironment {
    constructor(config) {
        super(config);
    }

    async setup() {
        await super.setup();

        const chromePath = await getChromePath();
        this.browser = await puppeteer.launch({executablePath: chromePath});
        this.global.__BROWSER__ = this.browser;

        await server.start();
        this.global.__SET_SERVER_PATHS__ = server.setPaths;
    }

    async teardown() {
        await super.teardown();
        this.browser.close();
        await server.close();
    }
}

module.exports = PuppeteerEnvironment;
