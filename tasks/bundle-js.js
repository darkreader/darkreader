const rollup = require('rollup');
const rollupPluginNodeResolve = require('rollup-plugin-node-resolve');
const rollupPluginTypescript = require('rollup-plugin-typescript');
const typescript = require('typescript');

const { getDestDir } = require('./paths');

module.exports = function createJSBundleTasks(gulp) {
    gulp.task('js-release', async () => await bundleJS({ production: true }));
    gulp.task('js-debug', async () => await bundleJS({ production: false }));

    async function bundleJS({ production }) {
        const dir = getDestDir({ production });
        const files = {
            'src/background/index.ts': `${dir}/background/index.js`,
            'src/ui/popup/index.tsx': `${dir}/ui/popup/index.js`,
        };
        await Promise.all(
            Object.keys(files)
                .map((src) => bundleJSEntry({
                    src,
                    dest: files[src],
                    production,
                })));
    }

    async function bundleJSEntry({ src, dest, name, production }) {
        const bundle = await rollup.rollup({
            input: src,
            plugins: [
                rollupPluginTypescript({
                    typescript,
                    removeComments: production ? true : false
                }),
                rollupPluginNodeResolve(),
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
