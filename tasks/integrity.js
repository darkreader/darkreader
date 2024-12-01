import {mkdir, rm, copyFile, writeFile, readFile, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';

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

function firefoxExtractHashMetaInfOrder(manifest) {
    function getDigestAlgos(lines) {
        const digestHeader = lines[3];
        if (digestHeader === 'Digest-Algorithms: MD5 SHA1') {
            return {
                type: 0,
                lineCount: 5,
                digestFormat: {
                    digestHeader,
                    digestLines: [
                        'MD5-Digest: ',
                        'SHA1-Digest: ',
                    ],
                    digestLinesLengths: [36, 41],
                },
            };
        } else if (digestHeader === 'Digest-Algorithms: MD5 SHA1 SHA256') {
            return {
                type: 1,
                lineCount: 6,
                digestFormat: {
                    digestHeader,
                    digestLines: [
                        'MD5-Digest: ',
                        'SHA1-Digest: ',
                        'SHA256-Digest: ',
                    ],
                    digestLinesLengths: [36, 41, 59],
                },
            };
        } else if (digestHeader === 'Digest-Algorithms: SHA1 SHA256') {
            return {
                type: 2,
                lineCount: 5,
                digestFormat: {
                    digestHeader,
                    digestLines: [
                        'SHA1-Digest: ',
                        'SHA256-Digest: ',
                    ],
                    digestLinesLengths: [41, 59],
                },
            };
        }
        throw new Error('Unknown combination of digest algorithms');
    }

    function getFileName(lines, fileIndex, lineCount, digestFormat) {
        const lineIndex = 2 + fileIndex * lineCount;
        assert(lines[lineIndex - 1] === '');
        assert(lines[lineIndex].startsWith('Name: '));
        assert(lines[lineIndex + 1] === digestFormat.digestHeader);
        for (let i = 0; i < digestFormat.digestLines.length; i++) {
            const line = lines[lineIndex + i + 2];
            assert(line.startsWith(digestFormat.digestLines[i]));
            assert(line.length === digestFormat.digestLinesLengths[i]);
        }
        const fileName = lines[lineIndex].substring('Name: '.length);
        return fileName;
    }

    function getFileCount(lines, lineCount) {
        const count = (lines.length - 3) / lineCount;
        assert(Number.isInteger(count));
        return count;
    }

    function isSorted(arr) {
        return arr.every((v, i, a) => !i || a[i - 1] <= v);
    }

    const lines = manifest.split('\n');
    assert(lines[0] === 'Manifest-Version: 1.0');

    const {type, lineCount, digestFormat} = getDigestAlgos(lines);
    const fileCount = getFileCount(lines, lineCount);

    const realOrder = [];
    for (let i = 0; i < fileCount; i++) {
        const fileName = getFileName(lines, i, lineCount, digestFormat);
        if (fileName !== 'manifest.json' && fileName !== 'mozilla-recommendation.json' && !fileName.startsWith('META-INF/')) {
            realOrder.push(fileName);
        }
    }

    if (isSorted(realOrder)) {
        return {type};
    }

    const sortedOrder = [...realOrder].sort();
    const order = [];
    for (let i = 0; i < realOrder.length; i++) {
        order.push(sortedOrder.indexOf(realOrder[i]));
    }

    return {type, order};
}

function getIndent(fileJSON) {
    return fileJSON.indexOf('"') - fileJSON.indexOf('\n') - 1;
}

function getManifestJSONData(fileJSON) {
    const indent = getIndent(fileJSON);
    const settings = JSON.parse(fileJSON).browser_specific_settings ? 1 : undefined;
    if (indent !== 2 || settings !== undefined) {
        return {
            settings,
            indent: indent !== 2 ? indent : undefined,
        };
    }
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
            // Fast-fail path, it is actually never taken in practice
            if (st.size !== size) {
                throw new Error('Stored file had changed');
            }
            log.ok(`Found release file (Firefox, ${version})`);
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


        const manifestMf = await readFile(`${tempDest}/META-INF/manifest.mf`, {encoding: 'utf-8'});
        const {type, order} = firefoxExtractHashMetaInfOrder(manifestMf);

        const manifestJSON = await readFile(`${tempDest}/manifest.json`, {encoding: 'utf-8'});
        const manifest = getManifestJSONData(manifestJSON);

        const info = {
            type,
            manifest,
            order,
        };
        await writeFile(`${dest}/info.json`, `${JSON.stringify(info)}\n`);
        await copyFile(`${tempDest}/META-INF/mozilla.rsa`, `${dest}/mozilla.rsa`);
        try {
            await copyFile(`${tempDest}/META-INF/cose.sig`, `${dest}/cose.sig`);
        } catch (e) {
            // Nothing
        }
        try {
            await copyFile(`${tempDest}/mozilla-recommendation.json`, `${dest}/mozilla-recommendation.json`);
        } catch (e) {
            // Nothing
        }
    }
}

async function main(noCache = false) {
    await firefoxFetchAllMetadata(noCache);
}

main();
