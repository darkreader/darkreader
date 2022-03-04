// @ts-check
const less = require('less');
const path = require('path');
const {getDestDir, PLATFORM, rootPath} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');
const {copyFile, readFile, writeFile} = require('./utils');

function getLessFiles({debug}) {
    const dir = getDestDir({debug, platform: PLATFORM.CHROME});
    return {
        [rootPath('src/ui/devtools/style.less')]: `${dir}/ui/devtools/style.css`,
        [rootPath('src/ui/popup/style.less')]: `${dir}/ui/popup/style.css`,
        [rootPath('src/ui/stylesheet-editor/style.less')]: `${dir}/ui/stylesheet-editor/style.css`,
    };
}

async function bundleCSSEntry({src, dest}) {
    const srcDir = path.dirname(src);
    const input = await readFile(src);
    const output = await less.render(input, {paths: [srcDir], math: 'always'});
    const {css} = output;
    await writeFile(dest, css);
}

async function bundleCSS({debug}) {
    const files = getLessFiles({debug});
    for (const [src, dest] of Object.entries(files)) {
        await bundleCSSEntry({src, dest});
    }
    const dir = getDestDir({debug, platform: PLATFORM.CHROME});
    const copyDirs = [PLATFORM.FIREFOX, PLATFORM.CHROME_MV3, PLATFORM.THUNDERBIRD].map((platform) => {
        return getDestDir({debug, platform});
    });
    for (const file of Object.values(files)) {
        for (const copyDir of copyDirs) {
            const copyTo = `${copyDir}/${file.substring(dir.length + 1)}`;
            await copyFile(file, copyTo);
        }
    }
}

module.exports = createTask(
    'bundle-css',
    bundleCSS,
).addWatcher(
    ['src/**/*.less'],
    async () => {
        await bundleCSS({debug: true});
        reload({type: reload.CSS});
    },
);
