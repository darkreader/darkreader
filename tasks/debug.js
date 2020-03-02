const bundleCSS = require('./bundle-css');
const bundleHtml = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const copy = require('./copy');
const reload = require('./reload');
const {runTasks} = require('./task');
const {log} = require('./utils');

const options = {
    production: false,
};

const debugTasks = [
    clean,
    bundleJS,
    bundleCSS,
    bundleHtml,
    bundleLocales,
    copy,
];

async function debug() {
    log.ok('DEBUG');
    try {
        await runTasks(debugTasks, options);
        debugTasks.forEach((task) => task.watch());
        reload({type: reload.FULL});
        log.ok('Watching...');
    } catch (err) {
        log.error('Debugging cancelled');
        process.exit(13);
    }
}

debug();
