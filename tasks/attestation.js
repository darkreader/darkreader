import {tmpdir} from 'node:os';
import {promisify} from 'node:util';
import {exec} from 'node:child_process';
const execP = promisify(exec);
import unzipper from 'adm-zip';
import {writeFile, readFile, stat} from 'node:fs/promises';
import {log} from './utils.js';

const tmpDirParent = `${tmpdir}/darkreader-attestation`;

async function fetchAllReleases() {
    try {
        const file = await readFile(`${tmpDirParent}/firefox-index.json`);
        log.ok('Found previously stored index');
        return JSON.parse(file);
    } catch {
        log.ok('Fetching release URLs from Mozilla');
    }
    const versions = [];
    let dataUrl = 'https://addons.mozilla.org/api/v5/addons/addon/darkreader/versions/';
    while (dataUrl) {
        const {next, results} = await (await fetch(dataUrl)).json();
        dataUrl = next;
        for (const {file, version} of results) {
            const {hash, url, size} = file;
            versions.push({version, hash, url, size});
        }
    }
    return versions;
}

function toBuffer(arrayBuffer) {
    const buffer = Buffer.alloc(arrayBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

function extractMetaInfOrder(manifest) {
    const lines = manifest.split('\n');

    function assert(claim) {
        if (!claim) {
            throw new Error('Assertion failed');
        }
    }

    function getDigestAlgos() {
        const digestLine = lines[3];
        if (digestLine === 'Digest-Algorithms: MD5 SHA1') {
            return {
                type: 0,
                lineCount: 5
            };
        } else if (digestLine === 'Digest-Algorithms: MD5 SHA1 SHA256') {
            return {
                type: 1,
                lineCount: 6
            };
        } else if (digestLine === 'Digest-Algorithms: SHA1 SHA256') {
            return {
                type: 2,
                lineCount: 5
            };
        }
    }

    function getFileName(fileIndex, lineCount) {
        const lineIndex = 2 + fileIndex * lineCount;
        const fileName = lines[lineIndex].substring('Name: '.length);
        return fileName;
    }

    function getFileCount(lineCount) {
        const count = (lines.length - 3) / lineCount;
        assert(Number.isInteger(count));
        return count;
    }

    function isSorted(arr) {
        return arr.every((v, i, a) => !i || a[i - 1] <= v);
    }

    assert(lines[0] === 'Manifest-Version: 1.0');

    const {type, lineCount} = getDigestAlgos();
    const fileCount = getFileCount(lineCount);

    const realOrder = [];
    for (let i = 0; i < fileCount; i++) {
        const fileName = getFileName(i, lineCount);
        if (fileName !== 'manifest.json' && fileName !== 'mozilla-recommendation.json' && !fileName.startsWith('META-INF/')) {
            realOrder.push(fileName);
        }
    }

    if (isSorted(realOrder)) {
        return {type};
    }

    const desiredOrder = [...realOrder].sort();
    const order = [];
    for (let i = 0; i < realOrder.length; i++) {
        order.push(realOrder.indexOf(desiredOrder[i]));
    }

    return {type, order};
}

async function main(noCache = false) {
    if (noCache) {
        await execP(`rm -rf ${tmpDirParent}`);
    }
    try {
        await execP(`mkdir ${tmpDirParent}`);
    } catch (e) {
        // No need to create already existing directory
    }

    const versions = await fetchAllReleases();
    log.ok(`Fetched release URLs (${versions.length})`);
    await writeFile(`${tmpDirParent}/firefox-index.json`, JSON.stringify(versions, null, 2));

    for (const {version, url, size} of versions) {
        const fileName = `${tmpDirParent}/firefox-${version}.xpi`;
        const dest = `./attestation/mozilla/${version}`;
        const tempDest = `${tmpDirParent}/firefox-${version}`;

        try {
            const st = await stat(fileName);
            if (st.size !== size) {
                throw new Error('Stored file had changed');
            }
            log.ok(`Found release file (${version})`);
        } catch {
            log.ok(`Fetching release file (${version})`);
            const file = await fetch(url);
            await writeFile(fileName, toBuffer(await file.arrayBuffer()));
            log.ok(`Wrote release file (${version})`);
        }

        await execP(`rm -rf ${tempDest}`);
        await execP(`mkdir ${tempDest}`);

        const zip = new unzipper(fileName);
        zip.extractAllTo(tempDest);

        await execP(`rm -rf ${dest}`);
        await execP(`mkdir ${dest}`);

        const manifest = await readFile(`${tempDest}/META-INF/manifest.mf`, {encoding: 'utf-8'});
        const {type, order} = extractMetaInfOrder(manifest);

        await writeFile(`${dest}/info.json`, `${JSON.stringify({type, order})}\n`);
        await execP(`cp -r ${tempDest}/META-INF/mozilla.rsa ${dest}/mozilla.rsa`);
        try {
            await execP(`cp -r ${tempDest}/META-INF/cose.sig ${dest}/cose.sig`);
        } catch (e) {
            // Nothing
        }
        try {
            await execP(`cp -r ${tempDest}/mozilla-recommendation.json ${dest}/mozilla-recommendation.json`);
        } catch (e) {
            // Nothing
            console.log(`Version ${version} does not have a recommendation file`);
        }
    }
}

main();
