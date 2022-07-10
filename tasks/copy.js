// @ts-check
const {getDestDir, PLATFORM} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');
const {pathExists, copyFile, readFile, writeFile, getPaths} = require('./utils');

const srcDir = 'src';
const cwdPaths = [
    'background/index.html',
    'config/**/*.{config,drconf}',
    'icons/**/*.*',
    'ui/assets/**/*.*',
    'ui/popup/compatibility.js',
    'ui/popup/index.html',
    'ui/devtools/index.html',
    'ui/stylesheet-editor/index.html',
];
const paths = cwdPaths.map((path) => `${srcDir}/${path}`);

function getCwdPath(/** @type {string} */srcPath) {
    return srcPath.substring(srcDir.length + 1);
}

async function copyEntry(path, {debug, platform}) {
    const cwdPath = getCwdPath(path);
    const destDir = getDestDir({debug, platform});
    if (platform === PLATFORM.CHROME_MV3 && cwdPath === 'background/index.html') {
        // Do nothing
    } else {
        const src = `${srcDir}/${cwdPath}`;
        const dest = `${destDir}/${cwdPath}`;
        await copyFile(src, dest);
    }
}

async function copy({platforms, debug}) {
    const files = await getPaths(paths);
    for (const file of files) {
        for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
            await copyEntry(file, {debug, platform});
        }
    }
}

module.exports = createTask(
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
        reload({type: reload.FULL});
    },
);
