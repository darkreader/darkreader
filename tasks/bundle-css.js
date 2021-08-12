const fs = require('fs-extra');
const less = require('less');
const path = require('path');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');

function getLessFiles({debug}) {
    const dir = getDestDir({debug});
    return {
        'src/ui/devtools/style.less': `${dir}/ui/devtools/style.css`,
        'src/ui/popup/style.less': `${dir}/ui/popup/style.css`,
        'src/ui/stylesheet-editor/style.less': `${dir}/ui/stylesheet-editor/style.css`,
    };
}

async function bundleCSSEntry({src, dest}) {
    const srcDir = path.join(process.cwd(), path.dirname(src));
    const input = await fs.readFile(src, {encoding: 'utf8'});
    const output = await less.render(input, {paths: [srcDir], math: 'always'});
    const {css} = output;
    await fs.outputFile(dest, css, {encoding: 'utf8'});
}

async function bundleCSS({debug}) {
    const files = getLessFiles({debug});
    for (const [src, dest] of Object.entries(files)) {
        await bundleCSSEntry({src, dest});
    }
    const dir = getDestDir({debug});
    const firefoxDir = getDestDir({debug, firefox: true});
    const thunderBirdDir = getDestDir({debug, thunderbird: true});
    for (const dest of Object.values(files)) {
        const ffDest = `${firefoxDir}/${dest.substring(dir.length + 1)}`;
        const tbDest = `${thunderBirdDir}/${dest.substring(dir.length + 1)}`;
        await fs.copy(dest, ffDest);
        await fs.copy(dest, tbDest);
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
