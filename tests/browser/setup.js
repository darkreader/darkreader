// @ts-check
const puppeteer = require('puppeteer-core');
const {getChromePath} = require('./paths');
const server = require('./server');
const instances = require('./shared');

module.exports = async () => {
    const chromePath = await getChromePath();
    const browser = await puppeteer.launch({executablePath: chromePath});
    instances.browser.set(browser);
    await server.start();
};
