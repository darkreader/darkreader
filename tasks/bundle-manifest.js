// @ts-check
const {PLATFORM, getDestDir} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');
const {readFile, writeFile} = require('./utils');

const srcDir = 'src';

async function readJSON(path) {
    const file = await readFile(path);
    return JSON.parse(file);
}

async function writeJSON(path, json) {
    const content = JSON.stringify(json, null, 4);
    return await writeFile(path, content);
}

async function patchManifest(platform) {
    const manifest = await readJSON(`${srcDir}/manifest.json`);
    const manifestPatch = platform === PLATFORM.CHROME ? {} : await readJSON(`${srcDir}/manifest-${platform}.json`);
    const pached = {...manifest, manifestPatch};
    if (platform === PLATFORM.CHROME_MV3) {
        pached.browser_action = undefined;
    }
    return pached;
}

async function manifests({platforms, debug}) {
    for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
        const manifest = patchManifest(platform);
        const destDir = getDestDir({debug, platform});
        await writeJSON(`${destDir}/manifest.json`, manifest);
    }
}

module.exports = createTask(
    'bundle-manifest',
    manifests,
).addWatcher(
    ['src/manifest*.json'],
    async (changedFiles, _, platforms) => {
        for (const file of changedFiles) {
            /*
            if (await pathExists(file)) {
                for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
                    await copyEntry(file, {debug: true, platform});
                }
            }
            */
        }
        reload({type: reload.FULL});
    },
);
