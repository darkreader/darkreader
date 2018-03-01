const rollup = require('rollup');
const rollupPluginCommonjs = require('rollup-plugin-commonjs');
const rollupPluginNodeResolve = require('rollup-plugin-node-resolve');
const rollupPluginTypescript = require('rollup-plugin-typescript');
const typescript = require('typescript');
const {logError} = require('./utils');

const {getDestDir} = require('./paths');

module.exports = function createJSBundleTasks(gulp) {
    gulp.task('js-release', async () => await bundleJS({production: true}));
    gulp.task('js-debug', async () => await bundleJS({production: false}));

    async function bundleJS({production}) {
        const dir = getDestDir({production});
        const files = {
            'src/background/index.ts': `${dir}/background/index.js`,
            'src/ui/devtools/index.tsx': `${dir}/ui/devtools/index.js`,
            'src/ui/popup/index.tsx': `${dir}/ui/popup/index.js`,
        };
        try {
            const bundles = Object.entries(files).map(([src, dest]) => bundleJSEntry({src, dest, production}));
            await Promise.all(bundles);
        } catch (err) {
            logError(err);
        }
    }

    async function bundleJSEntry({src, dest, name, production}) {
        const bundle = await rollup.rollup({
            input: src,
            plugins: [
                rollupPluginTypescript({
                    typescript,
                    removeComments: production ? true : false
                }),
                rollupPluginNodeResolve(),
                rollupPluginCommonjs(),
            ].filter((x) => x)
        });
        await bundle.write({
            file: dest,
            strict: true,
            format: 'iife',
            sourcemap: production ? false : 'inline',
        });
    }
};
