const bundleCSS = require('./bundle-css');
const bundleHtml = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const copy = require('./copy');
const foxify = require('./foxify');
const {runTasks, log} = require('./utils');
const zip = require('./zip');

async function release() {
    log.ok('RELEASE');
    try {
        await runTasks([
            clean,
            bundleJS,
            bundleCSS,
            bundleHtml,
            bundleLocales,
            copy,
            foxify,
            zip,
        ], {production: true});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

release();
