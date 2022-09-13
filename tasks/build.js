// @ts-check
import bundleAPI from './bundle-api.js';
import bundleCSS from './bundle-css.js';
import bundleJS from './bundle-js.js';
import bundleLocales from './bundle-locales.js';
import bundleManifest from './bundle-manifest.js';
import clean from './clean.js';
import copy from './copy.js';
import saveLog from './log.js';
import * as reload from './reload.js';
import codeStyle from './code-style.js';
import zip from './zip.js';
import {runTasks} from './task.js';
import {log} from './utils.js';
import {fork} from 'child_process';
import paths from './paths.js';
const {PLATFORM} = paths;

import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);

const standardTask = [
    clean,
    bundleJS,
    bundleCSS,
    bundleLocales,
    bundleManifest,
    copy,
    saveLog,
];

const buildTask = [
    ...standardTask,
    codeStyle,
    zip
];

async function build({platforms, debug, watch, log: logging, test}) {
    log.ok('BUILD');
    try {
        await runTasks(debug ? standardTask : buildTask, {platforms, debug, watch, log: logging, test});
        if (watch) {
            standardTask.forEach((task) => task.watch(platforms));
            reload.reload({type: reload.FULL});
            log.ok('Watching...');
        } else {
            log.ok('MISSION PASSED! RESPECT +');
        }
    } catch (err) {
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

async function api(debug, watch) {
    log.ok('API');
    try {
        const tasks = [bundleAPI];
        if (!debug) {
            tasks.push(codeStyle);
        }
        await runTasks(tasks, {platforms: {[PLATFORM.API]: true}, debug, watch, log: false, test: false});
        if (watch) {
            bundleAPI.watch();
            log.ok('Watching...');
        }
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
        console.log(err);
        log.error(`MISSION FAILED!`);
        process.exit(13);
    }
}

async function executeChildProcess(args) {
    if (process.env.BUILD_CHILD) {
        throw new Error('Infinite loop');
    }
    const env = {...process.env, BUILD_CHILD: '1'};
    const child = fork(__filename, args, {env});
    // Send SIGINTs as SIGKILLs, which are not ignored
    process.on('SIGINT', () => {
        child.kill('SIGKILL');
        process.exit(130);
    });
    return new Promise((resolve, reject) => child.on('error', reject).on('close', resolve));
}

async function run() {
    const args = process.argv.slice(2);

    // Enable Ctrl+C to cancel the build immediately
    if (!process.env.BUILD_CHILD) {
        return executeChildProcess(args);
    }

    const validArgs = ['--api', '--chrome', '--chrome-mv3', '--firefox', '--thunderbird', '--release', '--debug', '--watch', '--log-info', '--log-warn', '--test'];
    args.filter((arg) => !validArgs.includes(arg)).forEach((arg) => log.warn(`Unknown argument ${arg}`));

    const allPlatforms = !(args.includes('--api') || args.includes('--chrome') || args.includes('--chrome-mv3') || args.includes('--firefox') || args.includes('--thunderbird'));
    const platforms = {
        [PLATFORM.CHROME]: allPlatforms || args.includes('--chrome'),
        [PLATFORM.CHROME_MV3]: allPlatforms || args.includes('--chrome-mv3'),
        [PLATFORM.FIREFOX]: allPlatforms || args.includes('--firefox'),
        [PLATFORM.THUNDERBIRD]: allPlatforms || args.includes('--thunderbird'),
    };


    const release = args.includes('--release');
    const debug = args.includes('--debug');
    const watch = args.includes('--watch');
    const logInfo = watch && args.includes('--log-info');
    const logWarn = watch && args.includes('--log-warn');
    if (release && Object.values(platforms).some(Boolean)) {
        await build({platforms, debug: false, watch: false, log: null, test: false});
    }
    if (debug && Object.values(platforms).some(Boolean)) {
        await build({platforms, debug, watch, log: logWarn ? 'warn' : (logInfo ? 'info' : null), test: args.includes('--test')});
    }
    if (args.includes('--api')) {
        await api(debug, watch);
    }
}

run();
