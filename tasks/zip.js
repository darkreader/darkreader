const fs = require('fs');
const globby = require('globby');
const yazl = require('yazl');
const {getDestDir} = require('./paths');
const {createTask} = require('./task');

function archiveFiles({files, dest, cwd}) {
    return new Promise((resolve) => {
        const archive = new yazl.ZipFile();
        files.forEach((file) => archive.addFile(file, file.startsWith(`${cwd}/`) ? file.substring(cwd.length + 1) : file));
        archive.outputStream.pipe(fs.createWriteStream(dest)).on('close', () => resolve());
        archive.end();
    });
}

async function archiveDirectory({dir, dest}) {
    const files = await globby(`${dir}/**/*.*`);
    await archiveFiles({files, dest, cwd: dir});
}

async function zip({debug}) {
    const dir = getDestDir({debug});
    const firefoxDir = getDestDir({debug, firefox: true});
    const thunderBirdDir = getDestDir({debug, thunderbird: true});

    await archiveDirectory({dir, dest: 'build.zip'});
    await archiveDirectory({dir: firefoxDir, dest: 'build-firefox.xpi'});
    await archiveDirectory({dir: thunderBirdDir, dest: 'build-thunderbird.xpi'});
}

module.exports = createTask(
    'zip',
    zip,
);
