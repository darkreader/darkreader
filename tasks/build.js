// @ts-check
import process from 'node:process';

import bundleAPI from './bundle-api.js';
import bundleCSS from './bundle-css.js';
import bundleHTML from './bundle-html.js';
import bundleJS from './bundle-js.js';
import bundleLocales from './bundle-locales.js';
import bundleManifest from './bundle-manifest.js';
import bundleSignature from './bundle-signature.js';
import clean from './clean.js';
import codeStyle from './code-style.js';
import copy from './copy.js';
import saveLog from './log.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {runTasks} from './task.js';
import {log, pathExistsSync} from './utils.js';
import zip from './zip.js';

const standardTask = [
    clean,
    bundleHTML,
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
    platforms = {
        ...platforms,
        [PLATFORM.API]: false,
    };
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
        await runTasks(tasks, {platforms: {[PLATFORM.API]: true}, debug, watch, version: false, log: false, test: false});
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

async function run({release, debug, platforms, watch, log, test, version}) {
    const regular = Object.keys(platforms).some((platform) => platform !== PLATFORM.API && platforms[platform]);
    if (release && regular) {
        await build({platforms, version, debug: false, watch: false, log: null, test: false});
    }
    if (debug && regular) {
        await build({platforms, version, debug, watch, log, test});
    }
    if (platforms[PLATFORM.API]) {
        await api(debug, watch);
    }
}

function getParams(args) {
    const argMap = {
        '--api': PLATFORM.API,
        '--chrome': PLATFORM.CHROMIUM_MV2,
        '--chrome-mv2': PLATFORM.CHROMIUM_MV2,
        '--chrome-mv3': PLATFORM.CHROMIUM_MV3,
        '--chrome-plus': PLATFORM.CHROMIUM_MV2_PLUS,
        '--firefox': PLATFORM.FIREFOX_MV2,
        '--firefox-mv2': PLATFORM.FIREFOX_MV2,
        '--firefox-mv3': PLATFORM.FIREFOX_MV3,
        '--thunderbird': PLATFORM.THUNDERBIRD,
    };
    const platforms = {
        [PLATFORM.CHROMIUM_MV2]: false,
        [PLATFORM.CHROMIUM_MV2_PLUS]: false,
        [PLATFORM.CHROMIUM_MV3]: false,
        [PLATFORM.FIREFOX_MV2]: false,
        [PLATFORM.THUNDERBIRD]: false,
    };
    let allPlatforms = true;
    for (const arg of args) {
        if (argMap[arg]) {
            platforms[argMap[arg]] = true;
            allPlatforms = false;
        }
    }
    if ((args.includes('--chrome') || args.includes('--chrome-mv2')) && args.includes('--plus')) {
        platforms[PLATFORM.CHROMIUM_MV2] = false;
        platforms[PLATFORM.CHROMIUM_MV2_PLUS] = true;
    }
    if (allPlatforms) {
        Object.keys(platforms).forEach((platform) => platforms[platform] = true);
    }

    // TODO(Anton): remove me
    if (platforms[PLATFORM.FIREFOX_MV3]) {
        platforms[PLATFORM.FIREFOX_MV3] = false;
        console.log('Firefox MV3 build is not supported yet');
    }

    if (!pathExistsSync('./src/plus/')) {
        platforms[PLATFORM.CHROMIUM_MV2_PLUS] = false;
    }

    const versionArg = args.find((a) => a.startsWith('--version='));
    const version = versionArg ? versionArg.substring('--version='.length) : null;

    const release = args.includes('--release');
    const debug = args.includes('--debug');
    const watch = args.includes('--watch');
    const logInfo = watch && args.includes('--log-info');
    const logWarn = watch && args.includes('--log-warn');
    const logAssert = watch && args.includes('--log-assert');
    const log = logWarn ? 'warn' : (logInfo ? 'info' : (logAssert ? 'assert' : null));
    const test = args.includes('--test');

    return {release, debug, platforms, watch, log, test, version};
}

const args = process.argv.slice(2);
const params = getParams(args);
run(params);
