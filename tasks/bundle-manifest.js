// @ts-check
import {TEST_WEBSOCKET_CONNECT_SRC} from '../tests/browser/ports.js';
import {getDestDir, absolutePath} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {readJSON, writeJSON} from './utils.js';

/**
 * @param {string} csp
 * @returns {string}
 */
function patchCSPStringForTest(csp) {
    // Test builds talk to local HTTP servers and the Jest WebSocket harness.
    // Release/debug (non-test) builds keep connect-src 'self' only.
    return csp.replace(
        /connect-src[^;]+/,
        `connect-src 'self' ${TEST_WEBSOCKET_CONNECT_SRC} *`,
    );
}

async function patchManifest(platform, debug, watch, test) {
    const isMV2 = platform === PLATFORM.CHROMIUM_MV2 || platform === PLATFORM.CHROMIUM_MV2_PLUS;
    const isMV3 = platform === PLATFORM.CHROMIUM_MV3 || platform === PLATFORM.CHROMIUM_MV3_PLUS;
    const isPlus = platform === PLATFORM.CHROMIUM_MV2_PLUS || platform === PLATFORM.CHROMIUM_MV3_PLUS;

    const manifest = await readJSON(absolutePath('src/manifest.json'));
    const manifestPatch = isMV2 ? {} : await readJSON(absolutePath(`src/manifest-${platform.replace('-plus', '')}.json`));
    const manifestExtras = isPlus ? await readJSON(absolutePath(`src/plus/manifest.json`)) : {};
    const patched = {...manifest, ...manifestPatch, ...manifestExtras};
    if (debug && isMV3) {
        patched.name = isPlus ? 'Dark Reader MV3 Plus' : 'Dark Reader MV3';
    }
    if (isMV3) {
        patched.browser_action = undefined;
    }
    if (debug) {
        patched.version = '1';
        patched.description = `Debug build, platform: ${platform}, watch: ${watch ? 'yes' : 'no'}.`;
    }
    if (debug && isMV3) {
        patched.permissions.push('tabs');
    }
    if (debug && (isMV2 || isMV3)) {
        patched.version_name = isPlus ? 'Debug Plus' : 'Debug';
    }
    // Needed to test settings export and CSS theme export via a download
    if (test || debug) {
        patched.permissions.push('downloads');
    }
    if (test) {
        if (platform === PLATFORM.CHROMIUM_MV3 && patched.content_security_policy?.extension_pages) {
            patched.content_security_policy = {
                ...patched.content_security_policy,
                extension_pages: patchCSPStringForTest(patched.content_security_policy.extension_pages),
            };
        } else if (typeof patched.content_security_policy === 'string') {
            patched.content_security_policy = patchCSPStringForTest(patched.content_security_policy);
        }
    }
    return patched;
}

async function manifests({platforms, debug, watch, test}) {
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const platform of enabledPlatforms) {
        const manifest = await patchManifest(platform, debug, watch, test);
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
            const changed = chrome || changedFiles.some((file) => file.endsWith(`manifest-${platform.replace('-plus', '')}.json`));
            platforms[platform] = changed && buildPlatforms[platform];
        }
        await manifests({platforms, debug: true, watch: true, test: false});
        reload.reload({type: reload.FULL});
    },
);

export default bundleManifestTask;
