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

const buildTask = [
    ...standardTask,
    codeStyle,
    zip
];

async function build({debug, watch}) {
    log.ok('BUILD');
    try {
        await runTasks(debug ? standardTask : buildTask, {debug, watch});
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
        await runTasks([bundleAPI], {debug: false, watch: false});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

async function run() {
    const args = process.argv.slice(2);

    if (args.includes('--release')) {
        await build({debug: false, watch: false});
    }
    if (args.includes('--debug')) {
        await build({debug: true, watch: args.includes('--watch')});
    }
    if (args.includes('--api')) {
        await api();
    }
}

run();
