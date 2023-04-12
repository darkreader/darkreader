// @ts-check
import bundleAPI from './bundle-api.js';
import bundleCSS from './bundle-css.js';
import bundleJS from './bundle-js.js';
import bundleLocales from './bundle-locales.js';
import bundleManifest from './bundle-manifest.js';
import bundleSignature from './bundle-signature.js';
import clean from './clean.js';
import copy from './copy.js';
import saveLog from './log.js';
import * as reload from './reload.js';
import codeStyle from './code-style.js';
import zip from './zip.js';
import {runTasks} from './task.js';
import {log} from './utils.js';
import process from 'node:process';
import paths from './paths.js';
const {PLATFORM} = paths;

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
    zip,
];

const signedBuildTask = [
    ...standardTask,
    codeStyle,
    bundleSignature,
    zip,
];

async function build({platforms, debug, watch, log: logging, test, version}) {
    log.ok('BUILD');
    try {
        await runTasks(debug ? standardTask : (version ? signedBuildTask : buildTask), {platforms, debug, watch, log: logging, test, version});
        if (watch) {
            standardTask.forEach((task) => task.watch(platforms));
            reload.reload({type: reload.FULL});
            log.ok('Watching...');
        } else {
            log.ok('MISSION PASSED! RESPECT +');
        }
    } catch (err) {
        console.log(err);
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
        await runTasks(tasks, {platforms: {[PLATFORM.API]: true}, debug, watch, version: null, log: false, test: false});
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

async function run({api: api_, release, debug, platforms, watch, log, test, version}) {
    if (release && Object.values(platforms).some(Boolean)) {
        await build({platforms, version, debug: false, watch: false, log: null, test: false});
    }
    if (debug && Object.values(platforms).some(Boolean)) {
        await build({platforms, version, debug, watch, log, test});
    }
    if (api_) {
        await api(debug, watch);
    }
}

function getParams(args) {
    const allPlatforms = !(args.includes('--api') || args.includes('--chrome') || args.includes('--chrome-mv3') || args.includes('--firefox') || args.includes('--thunderbird'));
    const platforms = {
        [PLATFORM.CHROME]: allPlatforms || args.includes('--chrome'),
        [PLATFORM.CHROME_MV3]: allPlatforms || args.includes('--chrome-mv3'),
        [PLATFORM.FIREFOX]: allPlatforms || args.includes('--firefox'),
        [PLATFORM.THUNDERBIRD]: allPlatforms || args.includes('--thunderbird'),
    };

    const versionArg = args.find((a) => a.startsWith('--version='));
    const version = versionArg ? versionArg.substring('--version='.length) : null;

    const release = args.includes('--release');
    const debug = args.includes('--debug');
    const watch = args.includes('--watch');
    const logInfo = watch && args.includes('--log-info');
    const logWarn = watch && args.includes('--log-warn');
    const log = logWarn ? 'warn' : (logInfo ? 'info' : null);

    const test = args.includes('--test');
    const api = allPlatforms || args.includes('--api');

    return {api, release, debug, platforms, watch, log, test, version};
}

const args = process.argv.slice(2);
const params = getParams(args);
run(params);
