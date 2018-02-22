const fs = require('fs-extra');
const less = require('less');
const path = require('path');
const { getDestDir } = require('./paths');
const { logError } = require('./utils');

module.exports = function createCSSBundleTasks(gulp) {
    gulp.task('css-release', async () => await bundleCSS({ production: true }));
    gulp.task('css-debug', async () => await bundleCSS({ production: false }));

    async function bundleCSS({ production }) {
        const dir = getDestDir({ production });
        const files = {
            'src/ui/popup/style.less': `${dir}/ui/popup/style.css`,
        };
        try {
            const bundles = Object.entries(files).map(([src, dest]) => bundleCSSEntry({ src, dest, production }));
            await Promise.all(bundles);
        } catch (err) {
            logError(err);
        }
    }

    async function bundleCSSEntry({ src, dest, production }) {
        const content = await fs.readFile(src, 'utf8');
        const output = await less.render(
            content,
            {
                filename: path.resolve(src),
                sourceMap: production ? null : { sourceMapFileInline: true },
            }
        );
        await fs.outputFile(dest, output.css);
    }
};
