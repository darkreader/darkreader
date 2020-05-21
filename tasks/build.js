// @ts-check
const bundleAPI = require('./bundle-api');
const bundleCSS = require('./bundle-css');
const bundleHTML = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const copy = require('./copy');
const reload = require('./reload');
const codeStyle = require('./code-style');
const zip = require('./zip');
const {runTasks} = require('./task');
const {log} = require('./utils');

const standardTask = [
    clean,
    bundleJS,
    bundleCSS,
    bundleHTML,
    bundleLocales,
    copy,
];

async function release() {
    log.ok('RELEASE');
    try {
        await runTasks([...standardTask, codeStyle, zip], {production: true});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

async function debug({watch}) {
    log.ok('DEBUG');
    try {
        await runTasks(standardTask, {production: false});
        if (watch) {
            standardTask.forEach((task) => task.watch());
            reload({type: reload.FULL});
            log.ok('Watching...');
        } else {
            log.ok('MISSION PASSED! RESPECT +');
        }
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
        await release();
    }
    if (args.includes('--debug')) {
        await debug({watch: args.includes('--watch')});
    }
    if (args.includes('--api')) {
        await api();
    }

}

run();
