// @ts-check
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

import {getDestDir} from './paths.js';
import {PLATFORM} from './platform.js';
import {createTask} from './task.js';
import {copyFile, getPaths, readJSON, writeFile, fileExists} from './utils.js';

function serializeHashManifest(entries) {
    const lines = [];
    lines.push('Manifest-Version: 1.0');
    for (const {archivePath, integrity} of entries) {
        lines.push('');
        lines.push(`Name: ${archivePath}`);

        lines.push(`Digest-Algorithms:${integrity.md5 ? ' MD5' : ''}${integrity.sha1 ? ' SHA1' : ''}${integrity.sha256 ? ' SHA256' : ''}`);
        if (integrity.md5) {
            lines.push(`MD5-Digest: ${integrity.md5}`);
        }
        if (integrity.sha1) {
            lines.push(`SHA1-Digest: ${integrity.sha1}`);
        }
        if (integrity.sha256) {
            lines.push(`SHA256-Digest: ${integrity.sha256}`);
        }
    }

    lines.push('');
    lines.push('');

    return lines.join('\n');
}

async function enumerateStandardPaths(dir, order) {
    const path = `./${dir}`;
    let realPaths = await getPaths(path);
    realPaths = realPaths.sort();
    let completeRealPaths = realPaths.map((realPath) => ({
        realPath,
        archivePath: realPath.substring(dir.length + 1),
    }));
    completeRealPaths = completeRealPaths.filter(({archivePath}) => archivePath !== 'manifest.json' && !archivePath.startsWith('META-INF/'));

    // Re-order paths if needed
    if (order) {
        const correctPaths = [];
        for (let i = 0; i < order.length; i++) {
            correctPaths[i] = completeRealPaths[order[i]];
        }
        completeRealPaths = correctPaths;
    }

    // manifest.json always comes first
    return completeRealPaths;
}

function calculateHashForData(hashes, data) {
    const digests = {};
    for (const hash of hashes) {
        const h = createHash(hash);
        h.update(data);
        const digest = h.digest('base64');
        h.destroy();
        digests[hash] = digest;
    }
    return digests;
}

async function calculateHashesForFile(hashes, realPath, isOptional = false) {
    try {
        const data = await readFile(realPath, null);
        return calculateHashForData(hashes, data);
    } catch (e) {
        if (!isOptional) {
            throw e;
        }
    }
}

function hashTypes(signatureVersion) {
    if (signatureVersion === 0) {
        return ['md5', 'sha1'];
    } else if (signatureVersion === 1) {
        return ['md5', 'sha1', 'sha256'];
    } else if (signatureVersion === 2) {
        return ['sha1', 'sha256'];
    }
}

async function calculateHashes(types, paths) {
    for (let i = 0; i < paths.length; i++) {
        const digests = await calculateHashesForFile(types, paths[i].realPath, paths[i].isOptional);
        paths[i].integrity = digests;
    }
}

function serializeSfManifest(types, manifestMf) {
    const hashes = calculateHashForData(types, manifestMf);
    const lines = [];
    lines.push('Signature-Version: 1.0');
    if (hashes.md5) {
        lines.push(`MD5-Digest-Manifest: ${hashes.md5}`);
    }
    if (hashes.sha1) {
        lines.push(`SHA1-Digest-Manifest: ${hashes.sha1}`);
    }
    if (hashes.sha256) {
        lines.push(`SHA256-Digest-Manifest: ${hashes.sha256}`);
    }
    lines.push('');
    lines.push('');
    return lines.join('\n');
}

async function fixManifest(indent, settings) {
    const destDir = getDestDir({debug: false, platform: 'firefox'});
    const realPath = `${destDir}/manifest.json`;
    const manifest = await readJSON(realPath);
    let string = JSON.stringify(manifest, null, indent);
    if (settings === 1) {
        string = string.replace('applications', 'browser_specific_settings');
    }
    await writeFile(realPath, string);
    return {
        realPath,
        archivePath: 'manifest.json',
    };
}

async function createHashes(signatureVersion, version, order, manifest) {
    const types = hashTypes(signatureVersion);
    const destDir = getDestDir({debug: false, platform: 'firefox'});
    /** @type {Array<{archivePath: string; realPath?: string; isOptional?: boolean; integrity?: any}>} */
    const regular = [
        await fixManifest(manifest?.indent || 2, manifest?.settings),
        ...(await enumerateStandardPaths(destDir, order)),
    ];
    regular.push({
        realPath: `./integrity/firefox/${version}/mozilla-recommendation.json`,
        archivePath: 'mozilla-recommendation.json',
        isOptional: true,
    });
    await calculateHashes(types, regular);

    const coseManifest = serializeHashManifest(regular);
    if (await fileExists(`./integrity/firefox/${version}/cose.sig`)) {
        await writeFile(`${destDir}/META-INF/cose.manifest`, coseManifest);
        regular.push({
            archivePath: 'META-INF/cose.manifest',
            integrity: calculateHashForData(types, coseManifest),
        });
        regular.push({
            archivePath: 'META-INF/cose.sig',
            integrity: await calculateHashesForFile(types, `./integrity/firefox/${version}/cose.sig`),
        });
    }

    const manifestMf = serializeHashManifest(regular);
    await writeFile(`${destDir}/META-INF/manifest.mf`, manifestMf);

    const mozillaSf = serializeSfManifest(types, manifestMf);
    await writeFile(`${destDir}/META-INF/mozilla.sf`, mozillaSf);
}

/**
 * This utility function is written with readability in mind
 * It is a naiive implementation which does not take advantage of data streaming
 * and trivial parallelism of the task.
 */
async function signature({platforms, debug, version}) {
    if (!platforms[PLATFORM.FIREFOX_MV2] || debug) {
        throw new Error('Only Firefox builds support signed packages for now.');
    }

    const infoPath = `./integrity/firefox/${version}/info.json`;
    const {type, order, manifest} = await readJSON(infoPath);
    await createHashes(type, version, order, manifest);

    const destDir = getDestDir({debug, platform: 'firefox'});
    const rsa = `./integrity/firefox/${version}/mozilla.rsa`;
    const rsaDest = `${destDir}/META-INF/mozilla.rsa`;
    const sig = `./integrity/firefox/${version}/cose.sig`;
    const sigDest = `${destDir}/META-INF/cose.sig`;
    const recommendation = `./integrity/firefox/${version}/mozilla-recommendation.json`;
    const recommendationDest = `${destDir}/mozilla-recommendation.json`;
    await copyFile(rsa, rsaDest);
    try {
        await copyFile(sig, sigDest);
    } catch (e) {
        // Do nothing
    }
    try {
        await copyFile(recommendation, recommendationDest);
    } catch (e) {
        // Do nothing
    }
}

const signatureTask = createTask(
    'signature',
    signature,
);

export default signatureTask;
