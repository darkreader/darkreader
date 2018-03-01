const fs = require('fs-extra');
const {getDestDir} = require('./paths');

function replace(str, find, replace) {
    return str.split(find).join(replace);
}

module.exports = function createFoxifyTask(gulp) {
    gulp.task('foxify', async () => {
        const buildDir = getDestDir({production: true});
        const firefoxDir = getDestDir({production: true, firefox: true});

        // Copy files
        await fs.copy(buildDir, firefoxDir);

        // Patch manifest with Firefox values
        const manifest = await fs.readJson('src/manifest.json');
        const patch = await fs.readJson('src/manifest-firefox.json');
        const patched = Object.assign({}, manifest, patch);
        await fs.writeJson(`${firefoxDir}/manifest.json`, patched, {spaces: 4});

        // Prevent Firefox warnings for unsupported API
        const backgroundJsPath = `${firefoxDir}/background/index.js`;
        let content = await fs.readFile(backgroundJsPath, 'utf8');
        content = replace(content, 'chrome.fontSettings.getFontList', `chrome['font' + 'Settings']['get' + 'Font' + 'List']`);
        content = replace(content, 'chrome.fontSettings', `chrome['font' + 'Settings']`);
        await fs.outputFile(backgroundJsPath, content);
    });
};
