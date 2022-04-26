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
    'manifest.json',
];
const paths = cwdPaths.map((path) => `${srcDir}/${path}`);

function getCwdPath(/** @type {string} */srcPath) {
    return srcPath.substring(srcDir.length + 1);
}

async function readJSON(path) {
    const file = await readFile(path);
    return JSON.parse(file);
}

async function writeJSON(path, json) {
    const content = JSON.stringify(json, null, 4);
    return await writeFile(path, content);
}

async function patchManifestFirefox({debug, platform}) {
    const manifest = await readJSON(`${srcDir}/manifest.json`);
    const fireFoxPatch = await readJSON(`${srcDir}/manifest-firefox.json`);
    const thunderBirdPatch = await readJSON(`${srcDir}/manifest-thunderbird.json`);
    const patched = platform === PLATFORM.FIREFOX ? {...manifest, ...fireFoxPatch} : {...manifest, ...thunderBirdPatch};
    const destDir = getDestDir({debug, platform});
    await writeJSON(`${destDir}/manifest.json`, patched);
}

async function patchManifestMV3({debug}) {
    const manifest = await readJSON(`${srcDir}/manifest.json`);
    const mv3Patch = await readJSON(`${srcDir}/manifest-mv3.json`);
    const patched = {...manifest, ...mv3Patch};
    patched.browser_action = undefined;
    const destDir = getDestDir({debug, platform: PLATFORM.CHROME_MV3});
    await writeJSON(`${destDir}/manifest.json`, patched);
}

async function copyManifest(path, {debug, platform}) {
    const cwdPath = getCwdPath(path);
    const destDir = getDestDir({debug, platform});
    if ((platform === PLATFORM.FIREFOX || platform === PLATFORM.THUNDERBIRD) && cwdPath === 'manifest.json') {
        await patchManifestFirefox({debug, platform});
    } else if (platform === PLATFORM.CHROME_MV3 && cwdPath === 'manifest.json') {
        await patchManifestMV3({debug});
    } else if (platform === PLATFORM.CHROME_MV3 && cwdPath === 'background/index.html') {
        // Do nothing
    } else {
        const src = `${srcDir}/${cwdPath}`;
        const dest = `${destDir}/${cwdPath}`;
        await copyFile(src, dest);
    }
}

async function copy({debug}) {
    const files = await getPaths(paths);
    for (const file of files) {
        for (const platform of Object.values(PLATFORM)) {
            await copyManifest(file, {debug, platform});
        }
    }
}

module.exports = createTask(
    'copy',
    copy,
).addWatcher(
    paths,
    async (changedFiles) => {
        for (const file of changedFiles) {
            if (await pathExists(file)) {
                for (const platform of Object.values(PLATFORM)) {
                    await copyManifest(file, {debug: true, platform});
                }
            }
        }
        reload({type: reload.FULL});
    },
);
