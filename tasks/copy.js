const fs = require('fs-extra');
const globby = require('globby');
const {getDestDir, PLATFORM} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');

const srcDir = 'src';
const cwdPaths = [
    'background/index.html',
    'config/**/*.config',
    'icons/**/*.*',
    'ui/assets/**/*.*',
    'ui/popup/compatibility.js',
    'manifest.json',
];
const paths = cwdPaths.map((path) => `${srcDir}/${path}`);

function getCwdPath(/** @type {string} */srcPath) {
    return srcPath.substring(srcDir.length + 1);
}

async function patchManifest({debug, platform}) {
    const manifest = await fs.readJson(`${srcDir}/manifest.json`);
    const fireFoxPatch = await fs.readJson(`${srcDir}/manifest-firefox.json`);
    const thunderBirdPatch = await fs.readJson(`${srcDir}/manifest-thunderbird.json`);
    const patched = platform === PLATFORM.FIREFOX ? {...manifest, ...fireFoxPatch} : {...manifest, ...thunderBirdPatch};
    const destDir = getDestDir({debug, platform});
    await fs.writeJson(`${destDir}/manifest.json`, patched, {spaces: 4});
}

async function copyFile(path, {debug, platform}) {
    const cwdPath = getCwdPath(path);
    const destDir = getDestDir({debug, platform});
    if ((platform === PLATFORM.FIREFOX || platform === PLATFORM.THUNDERBIRD) && cwdPath === 'manifest.json') {
        await patchManifest({debug, platform});
    } else {
        const src = `${srcDir}/${cwdPath}`;
        const dest = `${destDir}/${cwdPath}`;
        await fs.copy(src, dest);
    }
}

async function copy({debug}) {
    const files = await globby(paths);
    for (const file of files) {
        await copyFile(file, {debug, platform: PLATFORM.CHROME});
        await copyFile(file, {debug, platform: PLATFORM.FIREFOX});
        await copyFile(file, {debug, platform: PLATFORM.THUNDERBIRD});
    }
}

module.exports = createTask(
    'copy',
    copy,
).addWatcher(
    paths,
    async (changedFiles) => {
        for (const file of changedFiles) {
            if (await fs.exists(file)) {
                await copyFile(file, {debug: true, platform: PLATFORM.CHROME});
                await copyFile(file, {debug: true, platform: PLATFORM.FIREFOX});
                await copyFile(file, {debug: true, platform: PLATFORM.THUNDERBIRD});
            }
        }
        reload({type: reload.FULL});
    },
);
