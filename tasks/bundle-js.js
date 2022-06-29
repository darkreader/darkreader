// @ts-check
const fs = require('fs');
const os = require('os');
const rollup = require('rollup');
const rollupPluginNodeResolve = require('@rollup/plugin-node-resolve').default;
/** @type {any} */
const rollupPluginReplace = require('@rollup/plugin-replace');
/** @type {any} */
const rollupPluginTypescript = require('@rollup/plugin-typescript');
const typescript = require('typescript');
const {getDestDir, PLATFORM, rootDir, rootPath} = require('./paths');
const reload = require('./reload');
const {PORT} = reload;
const {createTask} = require('./task');
const {copyFile, readFile, writeFile} = require('./utils');

async function copyToBrowsers({cwdPath, debug}) {
    const destPath = `${getDestDir({debug, platform: PLATFORM.CHROME})}/${cwdPath}`;
    for (const platform of [PLATFORM.FIREFOX, PLATFORM.CHROME_MV3, PLATFORM.THUNDERBIRD]) {
        const path = `${getDestDir({debug, platform})}/${cwdPath}`;
        await copyFile(destPath, path);
    }
}

function replace(str, find, replace) {
    return str.split(find).join(replace);
}

function patchFirefoxJS(/** @type {string} */code) {
    code = replace(code, 'chrome.fontSettings.getFontList', `chrome['font' + 'Settings']['get' + 'Font' + 'List']`);
    code = replace(code, 'chrome.fontSettings', `chrome['font' + 'Settings']`);
    return code;
}

function patchMV3JS(/** @type {string} */code) {
    // MV3 moves a few APIs around
    code = replace(code, 'chrome.browserAction.setIcon', 'chrome.action.setIcon');
    code = replace(code, 'chrome.browserAction.setBadgeBackgroundColor', 'chrome.action.setBadgeBackgroundColor');
    code = replace(code, 'chrome.browserAction.setBadgeText', 'chrome.action.setBadgeText');

    return code;
}

/**
 * @typedef JSEntry
 * @property {string} src
 * @property {string} dest
 * @property {string} reloadType
 * @property {(({debug}) => Promise<void>) | undefined} postBuild
 * @property {string[]} watchFiles
 * @property {(typeof PLATFORM.CHROME) | undefined} platform
 */

/** @type {JSEntry[]} */
const jsEntries = [
    {
        src: 'src/background/index.ts',
        dest: 'background/index.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            const destPath = `${getDestDir({debug, platform: PLATFORM.CHROME})}/${this.dest}`;
            const ffDestPath = `${getDestDir({debug, platform: PLATFORM.FIREFOX})}/${this.dest}`;
            // Prior to Chrome 93, background service worker had to be in top-level directory
            const mv3DestPath = `${getDestDir({debug, platform: PLATFORM.CHROME_MV3})}/background.js`;
            const tbDestPath = `${getDestDir({debug, platform: PLATFORM.THUNDERBIRD})}/${this.dest}`;
            const code = await readFile(destPath);
            const patchedCodeFirefox = patchFirefoxJS(code);
            const patchedCodeMV3 = patchMV3JS(code);
            await writeFile(ffDestPath, patchedCodeFirefox);
            await writeFile(mv3DestPath, patchedCodeMV3);
            await copyFile(ffDestPath, tbDestPath);
        },
        watchFiles: null,
    },
    {
        src: 'src/inject/index.ts',
        dest: 'inject/index.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchFiles: null,
    },
    {
        src: 'src/inject/dynamic-theme/mv3-injector.ts',
        dest: 'inject/injector.js',
        reloadType: reload.FULL,
        platform: PLATFORM.CHROME_MV3,
        watchFiles: null,
    },
    {
        src: 'src/inject/dynamic-theme/mv3-proxy.ts',
        dest: 'inject/proxy.js',
        reloadType: reload.FULL,
        platform: PLATFORM.CHROME_MV3,
        watchFiles: null,
    },
    {
        src: 'src/inject/fallback.ts',
        dest: 'inject/fallback.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchFiles: null,
    },
    {
        src: 'src/ui/devtools/index.tsx',
        dest: 'ui/devtools/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchFiles: null,
    },
    {
        src: 'src/ui/popup/index.tsx',
        dest: 'ui/popup/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchFiles: null,
    },
    {
        src: 'src/ui/stylesheet-editor/index.tsx',
        dest: 'ui/stylesheet-editor/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchFiles: null,
    },
];

async function bundleJS(/** @type {JSEntry} */entry, {debug, watch}) {
    const {src, dest} = entry;
    const bundle = await rollup.rollup({
        input: rootPath(src),
        plugins: [
            rollupPluginNodeResolve(),
            rollupPluginTypescript({
                rootDir,
                typescript,
                tsconfig: rootPath('src/tsconfig.json'),
                noImplicitAny: debug ? false : true,
                removeComments: debug ? false : true,
                sourceMap: debug ? true : false,
                inlineSources: debug ? true : false,
                noEmitOnError: true,
                cacheDir: debug ? `${fs.realpathSync(os.tmpdir())}/darkreader_typescript_cache` : null,
            }),
            rollupPluginReplace({
                preventAssignment: true,
                '__DEBUG__': debug ? 'true' : 'false',
                '__PORT__': watch ? String(PORT) : '-1',
                '__TEST__': 'false',
                '__WATCH__': watch ? 'true' : 'false',
            }),
        ].filter((x) => x)
    });
    entry.watchFiles = bundle.watchFiles;
    await bundle.write({
        file: `${getDestDir({debug, platform: entry.platform || PLATFORM.CHROME})}/${dest}`,
        strict: true,
        format: 'iife',
        sourcemap: debug ? 'inline' : false,
    });
    entry.postBuild && await entry.postBuild({debug});
}

function getWatchFiles() {
    const watchFiles = new Set();
    jsEntries.forEach((entry) => {
        entry.watchFiles.forEach((file) => watchFiles.add(file));
    });
    return Array.from(watchFiles);
}

/** @type {string[]} */
let watchFiles;

module.exports = createTask(
    'bundle-js',
    async ({debug, watch}) => await Promise.all(
        jsEntries.map((entry) => bundleJS(entry, {debug, watch}))
    ),
).addWatcher(
    () => {
        watchFiles = getWatchFiles();
        return watchFiles;
    },
    async (changedFiles, watcher) => {
        const entries = jsEntries.filter((entry) => {
            return changedFiles.some((changed) => {
                return entry.watchFiles.includes(changed);
            });
        });
        await Promise.all(
            entries.map((e) => bundleJS(e, {debug: true, watch: true}))
        );

        const newWatchFiles = getWatchFiles();
        watcher.unwatch(
            watchFiles.filter((oldFile) => !newWatchFiles.includes(oldFile))
        );
        watcher.add(
            newWatchFiles.filter((newFile) => watchFiles.includes(newFile))
        );

        const isUIOnly = entries.every((entry) => entry.reloadType === reload.UI);
        reload({
            type: isUIOnly ? reload.UI : reload.FULL,
        });
    },
);
