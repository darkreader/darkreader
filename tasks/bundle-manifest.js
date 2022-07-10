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
    const pacthed = {...manifest, ...manifestPatch};
    if (platform === PLATFORM.CHROME_MV3) {
        pacthed.browser_action = undefined;
    }
    return pacthed;
}

async function manifests({platforms, debug}) {
    for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
        const manifest = await patchManifest(platform);
        const destDir = getDestDir({debug, platform});
        await writeJSON(`${destDir}/manifest.json`, manifest);
    }
}

module.exports = createTask(
    'bundle-manifest',
    manifests,
).addWatcher(
    ['src/manifest*.json'],
    async (changedFiles, _, buildPlatforms) => {
        const chrome = changedFiles.some((file) => file.endsWith('manifest.json'));
        const platforms = {};
        for (const platform of Object.values(PLATFORM)) {
            const changed = chrome || changedFiles.some((file) => file.endsWith(`manifest-${platform}.json`));
            platforms[platform] = changed && buildPlatforms[platform];
        }
        await manifests({platforms, debug: true});
        reload({type: reload.FULL});
    },
);
