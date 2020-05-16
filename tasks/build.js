const bundleCSS = require('./bundle-css');
const bundleHTML = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const copy = require('./copy');
const {runTasks} = require('./task');
const {log} = require('./utils');

async function build() {
    log.ok('BUILDING');
    try {
        await runTasks([
            clean,
            bundleJS,
            bundleCSS,
            bundleHTML,
            bundleLocales,
            copy,
        ], {production: false});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        log.error(`MISSION FAILED! WASTED`);
        process.exit(13);
    }
}

build();
