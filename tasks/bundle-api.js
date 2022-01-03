// @ts-check
import {rollup} from 'rollup';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import rollupPluginReplace from '@rollup/plugin-replace';
import rollupPluginTypescript from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import fs from 'fs-extra';
import os from 'os';
import {createTask} from './task.js';

async function bundleAPI({debug}) {
    const src = 'src/api/index.ts';
    const dest = 'darkreader.js';

    const packageJSON = await fs.readJSON('package.json');

    const bundle = await rollup({
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

export default createTask(
    'bundle-api',
    bundleAPI,
);
