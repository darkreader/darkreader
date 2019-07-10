const fs = require('fs-extra');
const less = require('less');
const path = require('path');
const {getDestDir} = require('./paths');

function getLessFiles({production}) {
    const dir = getDestDir({production});
    return {
        'src/ui/devtools/style.less': `${dir}/ui/devtools/style.css`,
        'src/ui/popup/style.less': `${dir}/ui/popup/style.css`,
        'src/ui/stylesheet-editor/style.less': `${dir}/ui/stylesheet-editor/style.css`,
    };
}

async function bundleCSSEntry({src, dest}) {
    const srcDir = path.join(process.cwd(), path.dirname(src));
    const input = await fs.readFile(src, {encoding: 'utf8'});
    const output = await less.render(input, {paths: [srcDir]});
    const {css} = output;
    await fs.outputFile(dest, css, {encoding: 'utf8'});
}

async function bundleCSS({production}) {
    const files = getLessFiles({production});
    for (let [src, dest] of Object.entries(files)) {
        await bundleCSSEntry({src, dest});
    }
}

module.exports = bundleCSS;
