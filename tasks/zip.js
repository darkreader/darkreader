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

async function zip({platforms, debug}) {
    if (debug) {
        throw new Error('zip task does not support debug builds');
    }
    const releaseDir = 'build/release';
    const promises = [];
    for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
        const format = [PLATFORM.CHROME, PLATFORM.CHROME_MV3].includes(platform) ? 'zip' : 'xpi';
        promises.push(archiveDirectory({
            dir: getDestDir({debug, platform}),
            dest: `${releaseDir}/darkreader-${platform}.${format}`
        }));
    }
}

module.exports = createTask(
    'zip',
    zip,
);
