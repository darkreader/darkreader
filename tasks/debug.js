const bundleCSS = require('./bundle-css');
const bundleHtml = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const copy = require('./copy');
const foxify = require('./foxify');
const reload = require('./reload');
const {runTasks, log} = require('./utils');
const watch = require('./watch');

const options = {
    production: false,
};

async function debug() {
    log.ok('DEBUG');
    try {
        await runTasks([
            clean,
            bundleJS,
            bundleCSS,
            bundleHtml,
            bundleLocales,
            copy,
            foxify,
            reload,
        ], options);
        watch(options);
        log.ok('Watching...');
    } catch (err) {
        log.error('Debugging cancelled');
        process.exit(13);
    }
}

debug();
