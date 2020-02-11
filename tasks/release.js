const bundleCSS = require('./bundle-css');
const bundleHTML = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const codeStyle = require('./code-style');
const copy = require('./copy');
const {runTasks} = require('./task');
const {log} = require('./utils');
const zip = require('./zip');

async function release() {
    log.ok('RELEASE');
    try {
        await runTasks([
            clean,
            bundleJS,
            bundleCSS,
            bundleHTML,
            bundleLocales,
            copy,
            codeStyle,
            zip,
        ], {production: true});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

release();
