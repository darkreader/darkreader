// @ts-check
import path from './paths.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {readJSON, writeJSON} from './utils.js';
const {PLATFORM, getDestDir} = path;

const srcDir = 'src';

async function patchManifest(platform, debug, watch, test) {
    const manifest = await readJSON(`${srcDir}/manifest.json`);
    const manifestPatch = platform === PLATFORM.CHROME ? {} : await readJSON(`${srcDir}/manifest-${platform}.json`);
    const patched = {...manifest, ...manifestPatch};
    if (platform === PLATFORM.CHROME_MV3) {
        patched.browser_action = undefined;
    }
    if (debug) {
        patched.version = '1';
        patched.description = `Debug build, platform: ${platform}, watch: ${watch ? 'yes' : 'no'}.`;
    }
    if (debug && !test && platform === PLATFORM.CHROME_MV3) {
        patched.permissions.push('tabs');
    }
    if (debug && (platform === PLATFORM.CHROME || platform === PLATFORM.CHROME_MV3)) {
        patched.version_name = 'Debug';
    }
    return patched;
}

async function manifests({platforms, debug, watch, test, version}) {
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const platform of enabledPlatforms) {
        const manifest = await patchManifest(platform, debug, watch, test);
        const destDir = getDestDir({debug, platform});
        // Firefox Add-ons store parses and rewrites manifest.json during signing process
        // It only changes indentation to 2 spaces, but not the content or order of the keys
        const space = (version && platform === PLATFORM.FIREFOX) ? 2 : undefined;
        await writeJSON(`${destDir}/manifest.json`, manifest, space);
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
        await manifests({platforms, debug: true, watch: true, test: false, version: null});
        reload.reload({type: reload.FULL});
    },
);

export default bundleManifestTask;
