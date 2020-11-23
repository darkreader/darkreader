const fs = require('fs-extra');
const globby = require('globby');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');

const srcDir = 'src';
const modulesDir = 'node_modules';
const cwdPaths = [
    'background/index.html',
    'config/**/*.config',
    'icons/**/*.*',
    'ui/assets/**/*.*',
    'ui/popup/compatibility.js',
    'manifest.json',
];
const dependenciesPaths = [
    'codemirror/**/*.*'
]
const paths = cwdPaths.map((path) => `${srcDir}/${path}`).concat(dependenciesPaths.map((path) => `${modulesDir}/${path}`));

function getCwdPath(/** @type {string} */srcPath) {
    return srcPath.split('/').splice(1).join('/');
}

async function patchFirefoxManifest({debug}) {
    const manifest = await fs.readJson(`${srcDir}/manifest.json`);
    const patch = await fs.readJson(`${srcDir}/manifest-firefox.json`);
    const patched = {...manifest, ...patch};
    const firefoxDir = getDestDir({debug, firefox: true});
    await fs.writeJson(`${firefoxDir}/manifest.json`, patched, {spaces: 4});
}

async function copyFile(path, {debug, firefox}) {
    const cwdPath = getCwdPath(path);
    var destDir = getDestDir({debug, firefox});
    if (firefox && cwdPath === 'manifest.json') {
        await patchFirefoxManifest({debug});
    } else {
        const src = path;
        const dest = `${destDir}/${cwdPath}`;
        await fs.copy(src, dest);
    }
}

async function copy({debug}) {
    const files = await globby(paths);
    for (const file of files) {
        await copyFile(file, {debug, firefox: false});
        await copyFile(file, {debug, firefox: true});
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
                await copyFile(file, {debug: true, firefox: false});
                await copyFile(file, {debug: true, firefox: true});
            }
        }
        reload({type: reload.FULL});
    },
);
