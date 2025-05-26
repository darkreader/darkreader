// @ts-check
import {getDestDir} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {pathExists, copyFile, getPaths} from './utils.js';

/** @typedef {import('chokidar').FSWatcher} FSWatcher */
/** @typedef {import('./types').CopyEntry} CopyEntry */

/** @type {CopyEntry[]} */
const copyEntries = [
    {
        path: 'config',
        reloadType: reload.FULL,
    },
    {
        path: 'icons',
        reloadType: reload.FULL,
    },
    {
        path: 'ui/assets',
        reloadType: reload.UI,
    },
    {
        path: 'ui/popup/compatibility.js',
        reloadType: reload.UI,
        platforms: [PLATFORM.CHROMIUM_MV2],
    },
    {
        path: 'plus/assets',
        reloadType: reload.UI,
        platforms: [PLATFORM.CHROMIUM_MV2_PLUS],
    },
];

/**
 * @param {string} srcDir
 * @param {CopyEntry[]} copyEntries
 * @returns {ReturnType<typeof createTask>}
 */
export function createCopyTask(srcDir, copyEntries) {
    const paths = copyEntries.map((entry) => entry.path).map((path) => `${srcDir}/${path}`);

    /** @type {(path: string) => string} */
    const getCwdPath = (srcPath) => {
        return srcPath.substring(srcDir.length + 1);
    };

    /** @type {(path: string, options: {debug: boolean; platform: any}) => Promise<void>} */
    const copyEntry = async (path, {debug, platform}) => {
        const cwdPath = getCwdPath(path);
        const destDir = getDestDir({debug, platform});
        const src = `${srcDir}/${cwdPath}`;
        const dest = `${destDir}/${cwdPath}`;
        await copyFile(src, dest);
    };

    const copyAll = async ({platforms, debug}) => {
        const promises = [];
        const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
        for (const entry of copyEntries) {
            if (entry.platforms && !entry.platforms.some((platform) => platforms[platform])) {
                continue;
            }
            const files = await getPaths(`${srcDir}/${entry.path}`);
            for (const file of files) {
                for (const platform of enabledPlatforms) {
                    if (entry.platforms === undefined || entry.platforms.includes(platform)) {
                        promises.push(copyEntry(file, {debug, platform}));
                    }
                }
            }
        }
        await Promise.all(promises);
    };

    /** @type {(changedFiles: string[], watcher: FSWatcher, platforms: any) => Promise<void>} */
    const onChange = async (changedFiles, _, platforms) => {
        for (const file of changedFiles) {
            if (await pathExists(file)) {
                for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
                    await copyEntry(file, {debug: true, platform});
                }
            }
        }
        reload.reload({type: reload.FULL});
    };

    return createTask(
        'copy',
        copyAll,
    ).addWatcher(
        paths,
        onChange,
    );
}

export default createCopyTask('src', copyEntries);
