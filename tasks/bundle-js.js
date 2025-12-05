// @ts-check
// This plugin resolves location of malevic module
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
/** @type {any} */
import rollupPluginReplace from '@rollup/plugin-replace';
/** @type {any} */
import rollupPluginTypescript from '@rollup/plugin-typescript';
import * as rollup from 'rollup';
import typescript from 'typescript';

import {getDestDir, absolutePath} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
const {PORT} = reload;
import {createTask} from './task.js';

/** @typedef {import('chokidar').FSWatcher} FSWatcher */
/** @typedef {import('./types').JSEntry} JSEntry */
/** @typedef {import('./types').TaskOptions} TaskOptions */

/** @type {JSEntry[]} */
const jsEntries = [
    {
        src: 'src/background/index.ts',
        dest: 'background/index.js',
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
        platform: PLATFORM.CHROMIUM_MV3,
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
        platform: PLATFORM.CHROMIUM_MV3,
    },
    {
        src: 'src/ui/devtools/index.tsx',
        dest: 'ui/devtools/index.js',
        reloadType: reload.UI,
    },
    {
        src: 'src/ui/options/index.tsx',
        dest: 'ui/options/index.js',
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

/** @type {Record<string, any>} */
const rollupCache = {};

async function bundleJS(/** @type {JSEntry} */entry, platform, debug, watch, log, test) {
    const {src, dest} = entry;

    let replace = {};
    switch (platform) {
        case PLATFORM.FIREFOX_MV2:
        case PLATFORM.THUNDERBIRD:
            if (entry.src === 'src/ui/popup/index.tsx') {
                break;
            }
            replace = {
                'chrome.fontSettings.getFontList': `chrome['font' + 'Settings']['get' + 'Font' + 'List']`,
                'chrome.fontSettings': `chrome['font' + 'Settings']`,
            };
            break;
        case PLATFORM.CHROMIUM_MV3:
            replace = {
                'chrome.browserAction.setIcon': 'chrome.action.setIcon',
                'chrome.browserAction.setBadgeBackgroundColor': 'chrome.action.setBadgeBackgroundColor',
                'chrome.browserAction.setBadgeText': 'chrome.action.setBadgeText',
            };
            break;
    }

    // See comment below
    // TODO(anton): remove this once Firefox supports tab.eval() via WebDriver BiDi
    const mustRemoveEval = !test && (platform === PLATFORM.FIREFOX_MV2) && (entry.src === 'src/inject/index.ts');

    const cacheId = `${entry.src}-${platform}-${debug}-${watch}-${log}-${test}`;
    const outDir = getDestDir({debug, platform});

    const bundle = await rollup.rollup({
        input: absolutePath(src),
        preserveSymlinks: true,
        onwarn: (error) => {
            // TODO(anton): remove this once Firefox supports tab.eval() via WebDriver BiDi
            if (error.code === 'EVAL' && !mustRemoveEval) {
                return;
            }

            throw error;
        },
        plugins: [
            // Firefox WebDriver implementation does not currently support tab.eval() functions fully,
            // so we have to manually polyfill it via regular eval().
            // This plugin is necessary to avoid (benign) warnings in the console during builds, it just replaces
            // literally one occurrence of eval() in our code even before TypeScript even encounters it.
            // With this plugin, warning appears only on Firefox test builds.
            // TODO(anton): remove this once Firefox supports tab.eval() via WebDriver BiDi
            rollupPluginReplace({
                preventAssignment: true,
                'eval(': 'void(',
            }),
            rollupPluginNodeResolve(),
            rollupPluginTypescript({
                rootDir: absolutePath('.'),
                typescript,
                tsconfig: absolutePath('src/tsconfig.json'),
                compilerOptions: platform === PLATFORM.CHROMIUM_MV3 ? {
                    target: 'ES2022',
                } : undefined,
                noImplicitAny: debug ? false : true,
                noUnusedLocals: debug ? false : true,
                strictNullChecks: debug ? false : true,
                removeComments: debug ? false : true,
                sourceMap: debug ? true : false,
                inlineSources: debug ? true : false,
                noEmitOnError: watch ? false : true,
                outDir,
                paths: platform === PLATFORM.CHROMIUM_MV2_PLUS ? {
                    '@plus/*': ['./plus/*'],
                } : {
                    '@plus/*': ['./stubs/*'],
                },
            }),
            rollupPluginReplace({
                preventAssignment: true,
                ...replace,
                __DEBUG__: debug,
                __CHROMIUM_MV2__: platform === PLATFORM.CHROMIUM_MV2 || platform === PLATFORM.CHROMIUM_MV2_PLUS,
                __CHROMIUM_MV3__: platform === PLATFORM.CHROMIUM_MV3,
                __FIREFOX_MV2__: platform === PLATFORM.FIREFOX_MV2,
                __THUNDERBIRD__: platform === PLATFORM.THUNDERBIRD,
                __PLUS__: platform === PLATFORM.CHROMIUM_MV2_PLUS,
                __PORT__: watch ? String(PORT) : '-1',
                __TEST__: test,
                __WATCH__: watch,
                __LOG__: log ? `"${log}"` : false,
            }),
        ].filter(Boolean),
        cache: rollupCache[cacheId],
    });
    rollupCache[cacheId] = bundle.cache;
    entry.watchFiles = bundle.watchFiles;
    await bundle.write({
        file: `${outDir}/${dest}`,
        strict: true,
        format: 'iife',
        sourcemap: debug ? 'inline' : false,
    });
}

/**
 * @param {JSEntry[]} jsEntries
 * @returns {ReturnType<typeof createTask>}
 */
export function createBundleJSTask(jsEntries) {
    /** @type {string[]} */
    let currentWatchFiles;

    const getRelevantWatchFiles = () => {
        const watchFiles = new Set();
        jsEntries.forEach((entry) => {
            entry.watchFiles?.forEach((file) => watchFiles.add(file));
        });
        return Array.from(watchFiles);
    };

    /** @type {(options: Partial<TaskOptions> & {platforms: TaskOptions['platforms']}, entries?: JSEntry[]) => Promise<void>} */
    const bundleEachPlatform = async ({platforms, debug, watch, log, test}, entries) => {
        const allPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API);
        for (const entry of (entries || jsEntries)) {
            const possiblePlatforms = entry.platform ? [entry.platform] : allPlatforms;
            const targetPlatforms = possiblePlatforms.filter((platform) => platforms[platform]);
            for (const platform of targetPlatforms) {
                await bundleJS(entry, platform, debug, watch, log, test);
            }
        }
    };

    /** @type {(changedFiles: string[], watcher: FSWatcher, platforms: any) => Promise<void>} */
    const onChange = async (changedFiles, watcher, initialPlatforms) => {
        let platforms = {};
        const connectedBrowsers = reload.getConnectedBrowsers();
        if (connectedBrowsers.includes('chrome')) {
            platforms.chrome = initialPlatforms.chrome;
            platforms['chrome-mv3'] = initialPlatforms['chrome-mv3'];
            platforms['chrome-plus'] = initialPlatforms['chrome-plus'];
        }
        if (connectedBrowsers.includes('firefox')) {
            platforms.firefox = true;
        }
        if (connectedBrowsers.length === 0) {
            platforms = initialPlatforms;
        }

        const entries = jsEntries.filter((entry) => {
            return changedFiles.some((changed) => {
                return entry.watchFiles?.includes(changed);
            });
        });
        await bundleEachPlatform({platforms, debug: true, watch: true}, entries);

        const newWatchFiles = getRelevantWatchFiles();
        watcher.unwatch(
            currentWatchFiles.filter((oldFile) => !newWatchFiles.includes(oldFile))
        );
        watcher.add(
            newWatchFiles.filter((newFile) => currentWatchFiles.includes(newFile))
        );

        const isUIOnly = entries.every((entry) => entry.reloadType === reload.UI);
        reload.reload({
            type: isUIOnly ? reload.UI : reload.FULL,
        });
    };

    return createTask(
        'bundle-js',
        bundleEachPlatform,
    ).addWatcher(
        () => {
            currentWatchFiles = getRelevantWatchFiles();
            return currentWatchFiles;
        },
        onChange,
    );
}

export default createBundleJSTask(jsEntries);
