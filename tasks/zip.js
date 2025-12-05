// @ts-check
import {exec} from 'node:child_process';
import fs from 'node:fs';

import yazl from 'yazl';

import {getDestDir} from './paths.js';
import {PLATFORM} from './platform.js';
import {createTask} from './task.js';
import {getPaths} from './utils.js';

/**
 * @param {object} details
 * @returns {Promise<void>}
 */
function archiveFiles({files, dest, cwd, date, mode}) {
    return new Promise((resolve) => {
        const archive = new yazl.ZipFile();
        // Rproducible builds: sort filenames so files appear in the same order in zip
        files.sort();
        files.forEach((file) => archive.addFile(
            file,
            file.startsWith(`${cwd}/`) ? file.substring(cwd.length + 1) : file,
            {mtime: date, mode}
        ));
        /** @type {any} */
        const writeStream = fs.createWriteStream(dest);
        archive.outputStream.pipe(writeStream).on('close', resolve);
        archive.end();
    });
}

async function archiveDirectory({dir, dest, date, mode}) {
    const files = await getPaths(`${dir}/**/*.*`);
    await archiveFiles({files, dest, cwd: dir, date, mode});
}

/**
 * Reproducible builds: set file timestamp to last commit timestamp
 * Returns the date of the last git commit to be used as archive file timestamp
 * @returns {Promise<Date>} JavaScript Date object with date adjusted to counterbalance user's time zone
 */
async function getLastCommitTime() {
    // We need to offset the user's time zone since yazl can not represent time zone in produced archive
    // If called outside of the git tree, make sure we don't pass a negative date.
    return new Promise((resolve) =>
        exec('git log -1 --format=%ct', (_, stdout) => resolve(new Date(
            Math.max(0, Number(stdout) + (new Date()).getTimezoneOffset() * 60) * 1000
        ))));
}

async function zip({platforms, debug, version}) {
    if (debug) {
        throw new Error('zip task does not support debug builds');
    }
    version = version ? `-${version}` : '';
    const releaseDir = 'build/release';
    const promises = [];
    const date = await getLastCommitTime();
    /** @type {Array<import('./types.js').PlatformId>} */
    const chromePlatforms = [PLATFORM.CHROMIUM_MV2, PLATFORM.CHROMIUM_MV3, PLATFORM.CHROMIUM_MV2_PLUS];
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const platform of enabledPlatforms) {
        const format = chromePlatforms.includes(platform) ? 'zip' : 'xpi';
        promises.push(archiveDirectory({
            dir: getDestDir({debug, platform}),
            dest: `${releaseDir}/darkreader-${platform}${version}.${format}`,
            date,
            // Reproducible builds: set permission flags on file like chmod 644 or -rw-r--r--
            // This is needed because the built file might have different flags on different systems
            mode: 0o644,
        }));
    }
    await Promise.all(promises);
}

const zipTask = createTask(
    'zip',
    zip,
);

export default zipTask;
