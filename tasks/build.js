//@ts-check
const bundleAPI = require('./bundle-api');
const bundleCSS = require('./bundle-css');
const bundleHTML = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const codeStyle = require('./code-style');
const copy = require('./copy');
const reload = require('./reload');
const {runTasks} = require('./task');
const {log} = require('./utils');
const zip = require('./zip');

/**
 * @param {boolean} prod Pass option production true or false.
 */
async function release(prod) {
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
        ], {production: prod});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

const debugTasks = [
    clean,
    bundleJS,
    bundleCSS,
    bundleHTML,
    bundleLocales,
    copy,
];

async function debug() {
    log.ok('DEBUG');
    try {
        await runTasks(debugTasks, {production: false});
        debugTasks.forEach((task) => task.watch());
        reload({type: reload.FULL});
        log.ok('Watching...');
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

async function api() {
    log.ok('API');
    try {
        await runTasks([bundleAPI], {production: true});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

async function run() {
    const args = process.argv.slice(2);

    if (args.includes('--release')) {
        await release(true);
    }
    if (args.includes('--build')) {
        await release(false);
    }
    if (args.includes('--debug')) {
        await debug();
    }
    if (args.includes('--api')) {
        await api();
    }

}

run();