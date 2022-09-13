// @ts-check
import fs from 'fs';
import {exec} from 'child_process';
import yazl from 'yazl';
import paths from './paths.js';
import {createTask} from './task.js';
import {getPaths} from './utils.js';
const {getDestDir, PLATFORM} = paths;

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
            {mtime: date}
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
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const platform of enabledPlatforms) {
        const format = [PLATFORM.CHROME, PLATFORM.CHROME_MV3].includes(platform) ? 'zip' : 'xpi';
        promises.push(archiveDirectory({
            dir: getDestDir({debug, platform}),
            dest: `${releaseDir}/darkreader-${platform}.${format}`,
            date,
        }));
    }
    await Promise.all(promises);
}

const zipTask = createTask(
    'zip',
    zip,
);

export default zipTask;
