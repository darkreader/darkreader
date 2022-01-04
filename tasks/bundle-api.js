// @ts-check
const rollup = require('rollup');
const rollupPluginNodeResolve = require('@rollup/plugin-node-resolve').default;
/** @type {any} */
const rollupPluginReplace = require('@rollup/plugin-replace');
/** @type {any} */
const rollupPluginTypescript = require('rollup-plugin-typescript2');
const typescript = require('typescript');
const packageJSON = require('../package.json');
const fs = require('fs');
const os = require('os');
const {createTask} = require('./task');

async function bundleAPI({debug}) {
    const src = 'src/api/index.ts';
    const dest = 'darkreader.js';

    const bundle = await rollup.rollup({
        input: src,
        plugins: [
            rollupPluginNodeResolve(),
            rollupPluginTypescript({
                typescript,
                tsconfig: 'src/tsconfig.json',
                tsconfigOverride: {
                    compilerOptions: {
                        removeComments: true,
                        target: 'es5',
                    },
                },
                clean: true,
                cacheRoot: debug ? `${fs.realpathSync(os.tmpdir())}/darkreader_api_typescript_cache` : null,
            }),
            rollupPluginReplace({
                preventAssignment: true,
                '__DEBUG__': 'false',
            }),
        ].filter((x) => x)
    });
    await bundle.write({
        banner: `/**\n * Dark Reader v${packageJSON.version}\n * https://darkreader.org/\n */\n`,
        file: dest,
        strict: true,
        format: 'umd',
        name: 'DarkReader',
        sourcemap: false,
    });
}

module.exports = createTask(
    'bundle-api',
    bundleAPI,
);
