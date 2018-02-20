const mergeStream = require('merge-stream');
const rollup = require('rollup');
const rollupPluginNodeResolve = require('rollup-plugin-node-resolve');
const rollupPluginTypescript = require('rollup-plugin-typescript');
const rollupStream = require('rollup-stream');
const sourceStream = require('vinyl-source-stream');
const typescript = require('typescript');

const { getDestDir } = require('./paths');

module.exports = function createJSBundleTasks(gulp) {
    gulp.task('js-release', () => bundleJS({ production: true }));
    gulp.task('js-debug', () => bundleJS({ production: false }));

    function bundleJS({ production }) {
        const dir = getDestDir({ production });
        const files = {
            'src/background/index.ts': `${dir}/background`,
            'src/ui/popup/index.tsx': `${dir}/ui/popup`,
        };
        return mergeStream(
            ...Object.keys(files)
                .map((src) => bundleJSEntry({
                    src,
                    dest: files[src],
                    name: 'index.js',
                    production,
                }))
        );
    }

    function bundleJSEntry({ src, dest, name, production }) {
        return rollupStream({
            input: src,
            rollup,
            output: {
                strict: true,
                format: 'iife',
                sourcemap: production ? false : 'inline',
            },
            plugins: [
                rollupPluginTypescript({
                    typescript,
                    removeComments: production ? true : false
                }),
                rollupPluginNodeResolve(),
            ].filter((x) => x)
        })
            .pipe(sourceStream(name))
            .pipe(gulp.dest(dest));
    }
};
