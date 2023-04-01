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

async function chromeFetchAllReleases() {
    return [
        '4.9.62',
        '4.9.60',
        '4.9.58',
        '4.9.57',
        '4.9.56',
        '4.9.55',
        '4.9.52',
        '4.9.51',
        '4.9.48',
        '4.9.47',
        '4.9.45',
        '4.9.44',
        '4.9.43',
        '4.9.42',
        '4.9.40',
        '4.9.39',
        '4.9.38',
        '4.9.37',
        '4.9.35',
        '4.9.34',
        '4.9.33',
        '4.9.32',
        '4.9.31',
        '4.9.30',
        '4.9.29',
        '4.9.27',
        '4.9.26',
        '4.9.25',
        '4.9.24',
        '4.9.22',
        '4.9.21',
        '4.9.20',
        '4.9.19',
        '4.9.18',
        '4.9.17',
        '4.9.16',
        '4.9.15',
        '4.9.14',
        '4.9.13',
        '4.9.11',
        '4.9.9',
        '4.9.8',
        '4.9.5',
        '4.9.4',
        '4.9.2',
        '4.9.0',
        '4.8.10',
        '4.8.9',
        '4.8.8',
        '4.8.7',
        '4.8.6',
        '4.8.5',
        '4.8.4',
        '4.8.3',
        '4.8.2',
        '4.8.1',
        '4.8.0',
        '4.7.17',
        '4.7.16',
        '4.7.15',
        '4.7.14',
        '4.7.13',
        '4.7.12',
        '4.7.11',
        '4.7.10',
        '4.7.9',
        '4.7.8',
        '4.7.7',
        '4.7.6',
        '4.7.5',
        '4.7.4',
        '4.7.2',
        '4.7.1',
        '4.7.0',
        '4.6.12',
        '4.6.10',
        '4.6.9',
        '4.6.8',
        '4.6.7',
        '4.6.6',
        '4.6.5',
        '4.6.4',
        '4.6.3',
        '4.6.2',
        '4.6.0',
        '4.5.9',
        '4.5.7',
        '4.5.6',
        '4.5.5',
        '4.5.3',
        '4.5.2',
        '4.5.1',
        '4.5.0',
        '4.4.5',
        '4.4.4',
        '4.4.1',
        '4.3.3',
        '4.3.2',
        '4.3.0',
        '4.2.8',
        '4.2.7',
        '4.2.6',
        '4.2.5',
        '4.2.1',
        '4.1.0',
        '4.0.1',
        '3.5.4',
        '3.5.2',
        '3.5.1',
        '3.5.0',
        '3.4.3',
        '3.4.2',
        '3.4.1',
        '3.4.0',
        '3.3.0',
        '3.2.9',
        '3.2.8',
        '3.2.7',
        '3.2.6',
        '3.2.5',
        '3.2.4',
        '3.2.2',
        '3.2.1',
        '3.2.0',
        '3.1.3',
        '3.1.2',
        '3.0.4',
        '3.0.3',
        '3.0.2',
        '3.0.0',
        '2.3.1',
        '2.3.0',
        '2.2.2',
        '2.2.1',
        '2.2.0',
        '2.1.2',
        '2.1.1',
        '2.0.5'
    ];
}

async function chromeFetchAllMetadata() {
    const versions = await chromeFetchAllReleases();
    for (const version of versions) {
        const fileName = `${tmpDirParent}/chrome-${version}.crx`;
        const dest = `./integrity/chrome/${version}`;
        const tempDest = `${tmpDirParent}/chrome-${version}`;
        const url = `https://f6.crx4chrome.com/crx.php?i=eimadpbcbfnmbkopoojfekhnkhdbieeh&v=${version}`;

        try {
            await stat(fileName);
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


        /*

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
        */
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
        }
    }
}

async function main(noCache = false) {
    await firefoxFetchAllMetadata(noCache);
    //await chromeFetchAllMetadata(noCache);
}

main();
