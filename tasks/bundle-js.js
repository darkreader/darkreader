const fs = require('fs');
const os = require('os');
const rollup = require('rollup');
const rollupPluginCommonjs = require('rollup-plugin-commonjs');
const rollupPluginNodeResolve = require('rollup-plugin-node-resolve');
const rollupPluginReplace = require('rollup-plugin-replace');
const rollupPluginTypescript = require('rollup-plugin-typescript2');
const typescript = require('typescript');
const {getDestDir} = require('./paths');
const {PORT} = require('./reload');

function getJSFiles({production}) {
    const dir = getDestDir({production});
    return {
        'src/background/index.ts': `${dir}/background/index.js`,
        'src/inject/index.ts': `${dir}/inject/index.js`,
        'src/ui/devtools/index.tsx': `${dir}/ui/devtools/index.js`,
        'src/ui/popup/index.tsx': `${dir}/ui/popup/index.js`,
        'src/ui/stylesheet-editor/index.tsx': `${dir}/ui/stylesheet-editor/index.js`,
    };
}

async function bundleJSEntry({src, dest, production}) {
    const bundle = await rollup.rollup({
        input: src,
        plugins: [
            rollupPluginNodeResolve(),
            rollupPluginCommonjs(),
            rollupPluginTypescript({
                typescript,
                tsconfig: 'src/tsconfig.json',
                tsconfigOverride: {
                    compilerOptions: {
                        removeComments: production ? true : false,
                    },
                },
                clean: production ? true : false,
                cacheRoot: production ? null : `${fs.realpathSync(os.tmpdir())}/darkreader_typescript_cache`,
            }),
            rollupPluginReplace({
                '__DEBUG__': production ? 'false' : 'true',
                '__PORT__': production ? '-1' : String(PORT),
            }),
        ].filter((x) => x)
    });
    await bundle.write({
        file: dest,
        strict: true,
        format: 'iife',
        sourcemap: production ? false : 'inline',
    });
}

async function bundleJS({production}) {
    const files = getJSFiles({production});
    const bundles = Object.entries(files).map(([src, dest]) => bundleJSEntry({src, dest, production}));
    await Promise.all(bundles);
}

module.exports = bundleJS;
