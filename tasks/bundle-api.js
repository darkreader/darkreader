// @ts-check
import * as rollup from 'rollup';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
/** @type {any} */
import rollupPluginReplace from '@rollup/plugin-replace';
/** @type {any} */
import rollupPluginTypescript from '@rollup/plugin-typescript';
import typescript from 'typescript';
import fs from 'fs';
import os from 'os';
import {createTask} from './task.js';
import paths from './paths.js';
const {rootDir, rootPath} = paths;

async function getVersion() {
    const file = await fs.promises.readFile(new URL('../package.json', import.meta.url));
    const p = JSON.parse(file);
    return p.version;
}

async function bundleAPI({debug}) {
    const src = rootPath('src/api/index.ts');
    const dest = 'darkreader.js';
    const bundle = await rollup.rollup({
        input: src,
        plugins: [
            rollupPluginNodeResolve(),
            rollupPluginTypescript({
                rootDir,
                typescript,
                tsconfig: rootPath('src/api/tsconfig.json'),
                removeComments: true,
                noEmitOnError: true,
                cacheDir: debug ? `${fs.realpathSync(os.tmpdir())}/darkreader_api_typescript_cache` : null,
            }),
            rollupPluginReplace({
                preventAssignment: true,
                '__DEBUG__': 'false',
                '__MV3__': 'false',
                '__TEST__': 'false',
            }),
        ].filter((x) => x)
    });
    await bundle.write({
        banner: `/**\n * Dark Reader v${await getVersion()}\n * https://darkreader.org/\n */\n`,
        file: dest,
        strict: true,
        format: 'umd',
        name: 'DarkReader',
        sourcemap: false,
    });
}

const bundleAPITask = createTask(
    'bundle-api',
    bundleAPI,
);

export default bundleAPITask;
