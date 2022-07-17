// @ts-check
const fs = require('fs');
const {exec} = require('child_process');
const yazl = require('yazl');
const {getDestDir, PLATFORM} = require('./paths');
const {createTask} = require('./task');
const {getPaths} = require('./utils');

/**
 * @param {object} details
 * @returns {Promise<void>}
 */
function archiveFiles({files, dest, cwd, date}) {
    return new Promise((resolve) => {
        const archive = new yazl.ZipFile();
        files.sort();
        files.forEach((file) => archive.addFile(
            file,
            file.startsWith(`${cwd}/`) ? file.substring(cwd.length + 1) : file,
            { mtime: date }
        ));
        /** @type {any} */
        const writeStream = fs.createWriteStream(dest);
        archive.outputStream.pipe(writeStream).on('close', resolve);
        archive.end();
    });
}

async function archiveDirectory({dir, dest, date}) {
    const files = await getPaths(`${dir}/**/*.*`);
    await archiveFiles({files, dest, cwd: dir, date});
}

async function getLastCommitTime() {
    return new Promise((resolve) => 
        exec('git log -1 --format=%ct', (_, stdout) => resolve(new Date(Number(stdout) * 1000)))
    );
}

async function zip({platforms, debug}) {
    if (debug) {
        throw new Error('zip task does not support debug builds');
    }
    const releaseDir = 'build/release';
    const promises = [];
    const date = await getLastCommitTime();
    for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
        const format = [PLATFORM.CHROME, PLATFORM.CHROME_MV3].includes(platform) ? 'zip' : 'xpi';
        promises.push(archiveDirectory({
            dir: getDestDir({debug, platform}),
            dest: `${releaseDir}/darkreader-${platform}.${format}`,
            date,
        }));
    }
    await Promise.all(promises);
}

module.exports = createTask(
    'zip',
    zip,
);
