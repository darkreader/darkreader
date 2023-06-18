// @ts-check
import paths_ from './paths.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {copyFile, getPaths, writeFile} from './utils.js';
const {getDestDir, PLATFORM} = paths_;

const srcDir = 'src';

/**
 * @typedef copyEntry
 * @property {string} dest
 * @property {string} text
 * @property {string} reloadType
 * @property {(typeof PLATFORM.CHROMIUM_MV3)[] | undefined} [platforms]
 */

const text  = `\
<!DOCTYPE html>\
<html>\
\
<head>\
    <meta charset="utf-8">\
    <title>Dark Reader background</title>\
    <script src="index.js"></script>\
</head>\
\
<body></body>\
\
</html>`;

/** @type {copyEntry[]} */
const copyEntries = [
    {
        dest: 'background/index.html',
        text,
        reloadType: reload.FULL,
        platforms: [PLATFORM.CHROMIUM_MV2, PLATFORM.FIREFOX_MV2, PLATFORM.THUNDERBIRD],
    },
    {
        dest: 'ui/popup/index.html',
        text,
        reloadType: reload.UI,
    },
    {
        dest: 'ui/devtools/index.html',
        text,
        reloadType: reload.UI,
    },
    {
        dest: 'ui/stylesheet-editor/index.html',
        text,
        reloadType: reload.UI,
    },
];

const paths = copyEntries.map((entry) => entry.dest).map((path) => `${srcDir}/${path}`);

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

async function writeEntry(path, {debug, platform}) {
    const cwdPath = getCwdPath(path);
    const destDir = getDestDir({debug, platform});
    const src = `${srcDir}/${cwdPath}`;
    const dest = `${destDir}/${cwdPath}`;
    await writeFile(dest, '');
}

async function bundleHTML({platforms, debug}) {
    const promises = [];
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const entry of copyEntries) {
        if (entry.platforms && !entry.platforms.some((platform) => platforms[platform])) {
            continue;
        }
        const files = await getPaths(`${srcDir}/${entry.dest}`);
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

const bundleHTMLTask = createTask(
    'bundle-html',
    bundleHTML,
);

export default bundleHTMLTask;
