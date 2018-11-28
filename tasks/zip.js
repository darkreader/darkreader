const fs = require('fs');
const globby = require('globby');
const yazl = require('yazl');
const {getDestDir} = require('./paths');

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

async function zip({production}) {
    const dir = getDestDir({production});
    const firefoxDir = getDestDir({production, firefox: true});

    await archiveDirectory({dir, dest: 'build.zip'});
    await archiveDirectory({dir: firefoxDir, dest: 'build-firefox.xpi'});
}

module.exports = zip;
