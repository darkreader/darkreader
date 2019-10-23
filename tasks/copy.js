const fs = require('fs-extra');
const globby = require('globby');
const {getDestDir} = require('./paths');

const baseDir = 'src';
const paths = [
    'background/index.html',
    'config/**/*.config',
    'icons/**/*.*',
    'ui/assets/**/*.*',
    'ui/popup/compatibility.js',
    'manifest.json',
].map((path) => `${baseDir}/${path}`);

async function copy({production}) {
    const files = await globby(paths);
    const destDir = getDestDir({production});

    for (const file of files) {
        if (!file.startsWith(`${baseDir}/`)) {
            throw new Error(`Unable to handle path "${file}"`);
        }
        const dest = `${destDir}/${file.substring(baseDir.length + 1)}`;
        await fs.copy(file, dest);
    }
}

module.exports = copy;
