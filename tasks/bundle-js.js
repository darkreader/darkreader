// @ts-check
import fs from 'fs';
import os from 'os';
import * as rollup from 'rollup';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
/** @type {any} */
import rollupPluginReplace from '@rollup/plugin-replace';
/** @type {any} */
import rollupPluginTypescript from '@rollup/plugin-typescript';
import rollupPluginTypescript2 from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import paths from './paths.js';
import * as reload from './reload.js';
const {PORT} = reload;
import {createTask} from './task.js';
const {getDestDir, PLATFORM, rootDir, rootPath} = paths;

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
        src: 'src/inject/color-scheme-watcher.ts',
        dest: 'inject/color-scheme-watcher.js',
        reloadType: reload.FULL,
        platform: PLATFORM.CHROME_MV3,
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

const rollupPluginCache = {};

function getRollupPluginInstance(name, key, create) {
    if (!rollupPluginCache[name]) {
        rollupPluginCache[name] = {};
    }
    if (!rollupPluginCache[name][key]) {
        rollupPluginCache[name][key] = {};
    }
    if (!rollupPluginCache[name][key].instance) {
        rollupPluginCache[name][key].count = 0;
        rollupPluginCache[name][key].instance = create();
    }
    rollupPluginCache[name][key].count++;
    return rollupPluginCache[name][key].instance;
}

function freeRollupPluginInstance(name, key) {
    if (rollupPluginCache[name] && rollupPluginCache[name][key]) {
        rollupPluginCache[name][key].count--;
        if (rollupPluginCache[name][key].count === 0) {
            rollupPluginCache[name][key] = null;
        }
    }
}

async function bundleJS(/** @type {JSEntry} */entry, platform, debug, watch, log, test) {
    const {src, dest} = entry;
    const rollupPluginTypesctiptInstanceKey = `${platform}-${debug}`;
    const rollupPluginReplaceInstanceKey = `${platform}-${debug}-${watch}-${entry.src === 'src/ui/popup/index.tsx'}`;

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
            getRollupPluginInstance('nodeResolve', '', rollupPluginNodeResolve),
            getRollupPluginInstance('typesctipt', rollupPluginTypesctiptInstanceKey, () => {
                const plugin = debug ? rollupPluginTypescript2 : rollupPluginTypescript;
                const config = {
                    rootDir,
                    typescript,
                    tsconfig: rootPath('src/tsconfig.json'),
                    compilerOptions: platform === PLATFORM.CHROME_MV3 ? {
                        target: 'ES2022',
                    } : undefined,
                    noImplicitAny: debug ? false : true,
                    strictNullChecks: debug ? false : true,
                    removeComments: debug ? false : true,
                    sourceMap: debug ? true : false,
                    inlineSources: debug ? true : false,
                    noEmitOnError: watch ? false : true,
                    cacheDir: debug ? `${fs.realpathSync(os.tmpdir())}/darkreader_typescript_cache` : undefined,
                };
                if (debug) {
                    config.verbosty = 3;
                }
                return plugin(config);
            }),
            getRollupPluginInstance('replace', rollupPluginReplaceInstanceKey, () =>
                rollupPluginReplace({
                    preventAssignment: true,
                    ...replace,
                    __DEBUG__: debug,
                    __CHROMIUM_MV2__: platform === PLATFORM.CHROME,
                    __CHROMIUM_MV3__: platform === PLATFORM.CHROME_MV3,
                    __FIREFOX__: platform === PLATFORM.FIREFOX,
                    __THUNDERBIRD__: platform === PLATFORM.THUNDERBIRD,
                    __PORT__: watch ? String(PORT) : '-1',
                    __TEST__: test,
                    __WATCH__: watch,
                    __LOG__: log ? `"${log}"` : false,
                })
            ),
        ].filter((x) => x)
    });
    freeRollupPluginInstance('nodeResolve', '');
    freeRollupPluginInstance('typesctipt', rollupPluginTypesctiptInstanceKey);
    freeRollupPluginInstance('replace', rollupPluginReplaceInstanceKey);
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

const hydrateTask = (/** @type {JSEntry[]} */entries, platforms, /** @type {boolean} */debug, /** @type {boolean} */watch, log, test) =>
    entries.map((entry) =>
        (entry.platform ? [entry.platform] : Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API))
            .filter((platform) => platforms[platform])
            .map((platform) => bundleJS(entry, platform, debug, watch, log, test))
    ).flat();

const bundleJSTask = createTask(
    'bundle-js',
    async ({platforms, debug, watch, log, test}) => await Promise.all(hydrateTask(jsEntries, platforms, debug, watch, log, test)),
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
        reload.reload({
            type: isUIOnly ? reload.UI : reload.FULL,
        });
    },
);

export default bundleJSTask;
