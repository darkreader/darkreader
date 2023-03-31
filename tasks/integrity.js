import {tmpdir} from 'node:os';
import {promisify} from 'node:util';
import {mkdir, rm, writeFile, readFile, stat} from 'node:fs/promises';
import {exec} from 'node:child_process';
const execP = promisify(exec);
import unzipper from 'adm-zip';
import {log} from './utils.js';

const tmpDirParent = `${tmpdir()}/darkreader-integrity`;

function assert(claim) {
    if (!claim) {
        throw new Error('Assertion failed');
    }
}

async function firefoxFetchAllReleases() {
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

function firefoxExtractMetaInfOrder(manifest) {
    const lines = manifest.split('\n');

    function getDigestAlgos() {
        const digestLine = lines[3];
        if (digestLine === 'Digest-Algorithms: MD5 SHA1') {
            return {
                type: 0,
                lineCount: 5,
                digestLine,
            };
        } else if (digestLine === 'Digest-Algorithms: MD5 SHA1 SHA256') {
            return {
                type: 1,
                lineCount: 6,
                digestLine,
            };
        } else if (digestLine === 'Digest-Algorithms: SHA1 SHA256') {
            return {
                type: 2,
                lineCount: 5,
                digestLine,
            };
        }
    }

    function getFileName(fileIndex, lineCount, digestLine) {
        const lineIndex = 2 + fileIndex * lineCount;
        assert(lines[lineIndex - 1] === '');
        assert(lines[lineIndex].startsWith('Name: '));
        if (lines[lineIndex + 1] !== digestLine) console.log('"' + lines[lineIndex + 1] + '" !== "' + digestLine + '"');
        assert(lines[lineIndex + 1] === digestLine);
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

    const {type, lineCount, digestLine} = getDigestAlgos();
    const fileCount = getFileCount(lineCount);

    const realOrder = [];
    for (let i = 0; i < fileCount; i++) {
        const fileName = getFileName(i, lineCount, digestLine);
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

async function firefoxFetchAllMetadata(noCache = false) {
    if (noCache) {
        await rm(tmpDirParent, {force: true, recursive: true});
    }
    try {
        await mkdir(tmpDirParent, {recursive: true});
    } catch (e) {
        // No need to create already existing directory
    }

    const versions = await firefoxFetchAllReleases();
    log.ok(`Fetched release URLs (${versions.length})`);
    await writeFile(`${tmpDirParent}/firefox-index.json`, JSON.stringify(versions, null, 2));

    for (const {version, url, size} of versions) {
        const fileName = `${tmpDirParent}/firefox-${version}.xpi`;
        const dest = `./integrity/firefox/${version}`;
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

        await rm(tempDest, {force: true, recursive: true});
        await mkdir(tempDest, {recursive: true});
        await rm(dest, {force: true, recursive: true});
        await mkdir(dest, {recursive: true});

        const zip = new unzipper(fileName);
        zip.extractAllTo(tempDest);


        const manifest = await readFile(`${tempDest}/META-INF/manifest.mf`, {encoding: 'utf-8'});
        const {type, order} = firefoxExtractMetaInfOrder(manifest);

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

async function chromeFetchAllMetadata(noCache = false){

}

async function main(noCache = false) {
    await firefoxFetchAllMetadata(noCache);
    await chromeFetchAllMetadata(noCache);
}

main();
