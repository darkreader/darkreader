const fs = require('fs-extra');
const globby = require('globby');
const {getDestDir} = require('./paths');
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

async function patchFirefoxManifest({production}) {
    const manifest = await fs.readJson(`${srcDir}/manifest.json`);
    const patch = await fs.readJson(`${srcDir}/manifest-firefox.json`);
    const patched = {...manifest, ...patch};
    const firefoxDir = getDestDir({production, firefox: true});
    await fs.writeJson(`${firefoxDir}/manifest.json`, patched, {spaces: 4});
}

async function copyFile(path, {production, firefox}) {
    const cwdPath = getCwdPath(path);
    const destDir = getDestDir({production, firefox});
    if (firefox && cwdPath === 'manifest.json') {
        await patchFirefoxManifest({production});
    } else {
        const src = `${srcDir}/${cwdPath}`;
        const dest = `${destDir}/${cwdPath}`;
        await fs.copy(src, dest);
    }
}

async function copy({production}) {
    const files = await globby(paths);
    for (const file of files) {
        await copyFile(file, {production, firefox: false});
        await copyFile(file, {production, firefox: true});
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
                await copyFile(file, {production: false, firefox: false});
                await copyFile(file, {production: false, firefox: true});
            }
        }
        reload({type: reload.FULL});
    },
);
