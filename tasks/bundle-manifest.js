// @ts-check
import path from './paths.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {readFile, writeFile} from './utils.js';
const {PLATFORM, getDestDir} = path;

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
    const patched = {...manifest, ...manifestPatch};
    if (platform === PLATFORM.CHROME_MV3) {
        patched.browser_action = undefined;
    }
    return patched;
}

async function manifests({platforms, debug}) {
    for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
        const manifest = await patchManifest(platform);
        const destDir = getDestDir({debug, platform});
        await writeJSON(`${destDir}/manifest.json`, manifest);
    }
}

const bundleManifestTask = createTask(
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
        reload.reload({type: reload.FULL});
    },
);

export default bundleManifestTask;
