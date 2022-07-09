// @ts-check
const bundleAPI = require('./bundle-api');
const bundleCSS = require('./bundle-css');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const clean = require('./clean');
const copy = require('./copy');
const reload = require('./reload');
const codeStyle = require('./code-style');
const zip = require('./zip');
const {runTasks} = require('./task');
const {log} = require('./utils');
const {fork} = require('child_process');
const {PLATFORM} = require('./paths');

const standardTask = [
    clean,
    bundleJS,
    bundleCSS,
    bundleLocales,
    copy,
];

const buildTask = [
    ...standardTask,
    codeStyle,
    zip
];

async function build({platforms, debug, watch}) {
    log.ok('BUILD');
    try {
        await runTasks(debug ? standardTask : buildTask, {platforms, debug, watch});
        if (watch) {
            standardTask.forEach((task) => task.watch(platforms));
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
        await runTasks([bundleAPI], {platforms: {}, debug: false, watch: false});
        log.ok('MISSION PASSED! RESPECT +');
    } catch (err) {
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

    const allPlatforms = !(args.includes('--chrome') || args.includes('--chrome-mv3') || args.includes('--firefox') || args.includes('--thunderbird'));
    const platforms = {
        [PLATFORM.CHROME]: allPlatforms || args.includes('--chrome'),
        [PLATFORM.CHROME_MV3]: allPlatforms || args.includes('--chrome-mv3'),
        [PLATFORM.FIREFOX]: allPlatforms || args.includes('--firefox'),
        [PLATFORM.THUNDERBIRD]: allPlatforms || args.includes('--thunderbird'),
    };

    // Enable Ctrl+C to cancel the build immediately
    if (!process.env.BUILD_CHILD) {
        return executeChildProcess(args);
    }

    if (args.includes('--release')) {
        await build({platforms, debug: false, watch: false});
    }
    if (args.includes('--debug')) {
        await build({platforms, debug: true, watch: args.includes('--watch')});
    }
    if (args.includes('--api')) {
        await api();
    }
}

run();
