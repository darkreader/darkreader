// @ts-check
/** @typedef {import('puppeteer-core').Browser} Browser */

/** @type {Browser} */
let browser;

module.exports = {
    browser: {
        get() {
            return browser;
        },
        set(/** @type {Browser} */instance) {
            browser = instance;
        },
    },
};
