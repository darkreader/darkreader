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

process.setMaxListeners(50);

/**
 * @typedef JSEntry
 * @property {string} src
 * @property {string | ((platform: string) => string)} dest
 * @property {string} reloadType
 * @property {string[]} [watchFiles]
 * @property {(typeof PLATFORM.CHROME) | undefined} [platform]
 */

/** @type {JSEntry[]} */
const jsEntries = [
    {
        src: 'src/background/index.ts',
        // Prior to Chrome 93, background service worker had to be in top-level directory
        dest: (platform) => platform === PLATFORM.CHROME_MV3 ? 'background.js' : 'background/index.js',
        reloadType: reload.FULL,
    },
    {
        src: 'src/inject/index.ts',
        dest: 'inject/index.js',
        reloadType: reload.FULL,
    },
    {
        src: 'src/inject/dynamic-theme/mv3-injector.ts',
        dest: 'inject/injector.js',
        reloadType: reload.FULL,
        platform: PLATFORM.CHROME_MV3,
    },
    {
        src: 'src/inject/dynamic-theme/mv3-proxy.ts',
        dest: 'inject/proxy.js',
        reloadType: reload.FULL,
        platform: PLATFORM.CHROME_MV3,
    },
    {
        src: 'src/inject/fallback.ts',
        dest: 'inject/fallback.js',
        reloadType: reload.FULL,
    },
    {
        src: 'src/ui/devtools/index.tsx',
        dest: 'ui/devtools/index.js',
        reloadType: reload.UI,
    },
    {
        src: 'src/ui/popup/index.tsx',
        dest: 'ui/popup/index.js',
        reloadType: reload.UI,
    },
    {
        src: 'src/ui/stylesheet-editor/index.tsx',
        dest: 'ui/stylesheet-editor/index.js',
        reloadType: reload.UI,
    },
];

async function bundleJS(/** @type {JSEntry} */entry, platform, {debug, watch}) {
    const {src, dest} = entry;
    const destination = typeof dest === 'string' ? dest : dest(platform);
    let replace = {};
    switch (platform) {
        case PLATFORM.FIREFOX:
        case PLATFORM.THUNDERBIRD:
            if (entry.src === 'src/ui/popup/index.tsx') {
                break;
            }
            replace = {
                'chrome.fontSettings.getFontList': `chrome['font' + 'Settings']['get' + 'Font' + 'List']`,
                'chrome.fontSettings': `chrome['font' + 'Settings']`
            };
            break;
        case PLATFORM.CHROME_MV3:
            replace = {
                'chrome.browserAction.setIcon': 'chrome.action.setIcon',
                'chrome.browserAction.setBadgeBackgroundColor': 'chrome.action.setBadgeBackgroundColor',
                'chrome.browserAction.setBadgeText': 'chrome.action.setBadgeText',
            };
            break;
    }

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
                ...replace,
                '__DEBUG__': debug ? 'true' : 'false',
                '__MV3__': platform === PLATFORM.CHROME_MV3,
                '__PORT__': watch ? String(PORT) : '-1',
                '__TEST__': 'false',
                '__WATCH__': watch ? 'true' : 'false',
            }),
        ].filter((x) => x)
    });
    entry.watchFiles = bundle.watchFiles;
    await bundle.write({
        file: `${getDestDir({debug, platform})}/${destination}`,
        strict: true,
        format: 'iife',
        sourcemap: debug ? 'inline' : false,
    });
}

function getWatchFiles() {
    const watchFiles = new Set();
    jsEntries.forEach((entry) => {
        entry.watchFiles?.forEach((file) => watchFiles.add(file));
    });
    return Array.from(watchFiles);
}

/** @type {string[]} */
let watchFiles;

function hydrateTask(/** @type {JSEntry[]} */entries, platforms, /** @type {boolean} */debug, /** @type {boolean} */watch) {
    return entries.map((entry) => {
        if (entry.platform) {
            if (platforms[entry.platform]) {
                return [bundleJS(entry, entry.platform, {debug, watch})];
            }
            return [];
        }
        return Object.values(PLATFORM).filter((platform) => platforms[platform]).map((platform) =>
            bundleJS(entry, platform, {debug, watch}));
    }).flat();
}

module.exports = createTask(
    'bundle-js',
    async ({platforms, debug, watch}) => await Promise.all(hydrateTask(jsEntries, platforms, debug, watch)),
).addWatcher(
    () => {
        watchFiles = getWatchFiles();
        return watchFiles;
    },
    async (changedFiles, watcher, platforms) => {
        const entries = jsEntries.filter((entry) => {
            return changedFiles.some((changed) => {
                return entry.watchFiles?.includes(changed);
            });
        });
        await Promise.all(hydrateTask(entries, platforms, true, true));

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
