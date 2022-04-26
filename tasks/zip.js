// @ts-check
const fs = require('fs');
const yazl = require('yazl');
const {getDestDir, PLATFORM} = require('./paths');
const {createTask} = require('./task');
const {getPaths} = require('./utils');

function archiveFiles({files, dest, cwd}) {
    return new Promise((resolve) => {
        const archive = new yazl.ZipFile();
        files.forEach((file) => archive.addFile(file, file.startsWith(`${cwd}/`) ? file.substring(cwd.length + 1) : file));
        /** @type {any} */
        const writeStream = fs.createWriteStream(dest);
        archive.outputStream.pipe(writeStream).on('close', () => resolve());
        archive.end();
    });
}

async function archiveDirectory({dir, dest}) {
    const files = await getPaths(`${dir}/**/*.*`);
    await archiveFiles({files, dest, cwd: dir});
}

async function zip({debug}) {
    const dir = getDestDir({debug, platform: PLATFORM.CHROME});
    const firefoxDir = getDestDir({debug, platform: PLATFORM.FIREFOX});
    const chromeMV3Dir = getDestDir({debug, platform: PLATFORM.CHROME_MV3});
    const thunderBirdDir = getDestDir({debug, platform: PLATFORM.THUNDERBIRD});

    const releaseDir = 'build/release';
    const chromeDest = `${releaseDir}/darkreader-chrome.zip`;
    const chromeMV3Dest = `${releaseDir}/darkreader-chrome-mv3.zip`;
    const firefoxDest = `${releaseDir}/darkreader-firefox.xpi`;
    const thunderbirdDest = `${releaseDir}/darkreader-thunderbird.xpi`;
    await archiveDirectory({dir, dest: chromeDest});
    await archiveDirectory({dir: firefoxDir, dest: firefoxDest});
    await archiveDirectory({dir: chromeMV3Dir, dest: chromeMV3Dest});
    await archiveDirectory({dir: thunderBirdDir, dest: thunderbirdDest});
}

module.exports = createTask(
    'zip',
    zip,
);
