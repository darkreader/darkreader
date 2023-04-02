// @ts-check
import paths_ from './paths.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {pathExists, copyFile, getPaths} from './utils.js';
const {getDestDir, PLATFORM} = paths_;

const srcDir = 'src';

/**
 * @typedef copyEntry
 * @property {string} src
 * @property {string} reloadType
 * @property {(typeof PLATFORM.CHROME)[] | undefined} [platforms]
 */

/** @type {copyEntry[]} */
const copyEntries = [
    {
        src: 'background/index.html',
        reloadType: reload.FULL,
        platforms: [PLATFORM.CHROME, PLATFORM.FIREFOX, PLATFORM.THUNDERBIRD]
    },
    {
        src: 'config/**/*.{config,drconf}',
        reloadType: reload.FULL,
    },
    {
        src: 'icons/**/*.*',
        reloadType: reload.FULL,
    },
    {
        src: 'ui/assets/**/*.*',
        reloadType: reload.UI,
    },
    {
        src: 'ui/popup/compatibility.js',
        reloadType: reload.UI,
    },
    {
        src: 'ui/popup/index.html',
        reloadType: reload.UI,
    },
    {
        src: 'ui/devtools/index.html',
        reloadType: reload.UI,
    },
    {
        src: 'ui/stylesheet-editor/index.html',
        reloadType: reload.UI,
    },
];

const paths = copyEntries.map((entry) => entry.src).map((path) => `${srcDir}/${path}`);

function getCwdPath(/** @type {string} */srcPath) {
    return srcPath.substring(srcDir.length + 1);
}

async function copyEntry(path, {debug, platform}) {
    const cwdPath = getCwdPath(path);
    const destDir = getDestDir({debug, platform});
    const src = `${srcDir}/${cwdPath}`;
    const dest = `${destDir}/${cwdPath}`;
    await copyFile(src, dest);
}

async function copy({platforms, debug}) {
    const promises = [];
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const entry of copyEntries) {
        if (entry.platforms && !entry.platforms.some((platform) => platforms[platform])) {
            continue;
        }
        const files = await getPaths(`${srcDir}/${entry.src}`);
        for (const file of files) {
            for (const platform of enabledPlatforms) {
                if (entry.platforms === undefined || entry.platforms.includes(platform)) {
                    promises.push(copyEntry(file, {debug, platform}));
                }
            }
        }
    }
    await Promise.all(promises);
}

const copyTask = createTask(
    'copy',
    copy,
).addWatcher(
    paths,
    async (changedFiles, _, platforms) => {
        for (const file of changedFiles) {
            if (await pathExists(file)) {
                for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
                    await copyEntry(file, {debug: true, platform});
                }
            }
        }
        reload.reload({type: reload.FULL});
    },
);

export default copyTask;
