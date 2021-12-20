// @ts-check
import bundleAPI from './bundle-api.js';
import bundleCSS from './bundle-css.js';
import bundleHTML from './bundle-html.js';
import bundleJS from './bundle-js.js';
import bundleLocales from './bundle-locales.js';
import clean from './clean.js';
import copy from './copy.js';
import reload from './reload.js';
import codeStyle from './code-style.js';
import zip from './zip.js';
import {runTasks} from './task.js';
import {log} from './utils.js';

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
