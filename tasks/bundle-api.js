// @ts-check
import * as rollup from 'rollup';
/** @type {any} */
import rollupPluginReplace from '@rollup/plugin-replace';
/** @type {any} */
import rollupPluginTypescript from '@rollup/plugin-typescript';
import typescript from 'typescript';
import fs from 'node:fs';
import os from 'node:os';
import {createTask} from './task.js';
import paths from './paths.js';
const {rootDir, rootPath} = paths;

async function getVersion() {
    const file = await fs.promises.readFile(new URL('../package.json', import.meta.url), 'utf8');
    const p = JSON.parse(file);
    return p.version;
}

let watchFiles = [];

async function bundleAPI({debug, watch}) {
    const src = rootPath('src/api/index.ts');
    const dest = 'darkreader.js';
    const bundle = await rollup.rollup({
        input: src,
        onwarn: (error) => {
            throw error;
        },
        plugins: [
            rollupPluginTypescript({
                rootDir,
                typescript,
                tsconfig: rootPath('src/api/tsconfig.json'),
                noImplicitAny: debug ? false : true,
                noUnusedLocals: debug ? false : true,
                strictNullChecks: debug ? false : true,
                removeComments: debug ? false : true,
                sourceMap: debug ? true : false,
                inlineSources: debug ? true : false,
                noEmitOnError: watch ? false : true,
                cacheDir: debug ? `${fs.realpathSync(os.tmpdir())}/darkreader_api_typescript_cache` : undefined,
            }),
            rollupPluginReplace({
                preventAssignment: true,
                __DEBUG__: false,
                __CHROMIUM_MV2__: false,
                __CHROMIUM_MV3__: false,
                __FIREFOX_MV2__: false,
                __THUNDERBIRD__: false,
                __TEST__: false,
            }),
        ].filter(Boolean),
    });
    watchFiles = bundle.watchFiles;
    await bundle.write({
        banner: `/**\n * Dark Reader v${await getVersion()}\n * https://darkreader.org/\n */\n`,
        // TODO: Consider removing next line
        esModule: true,
        file: dest,
        strict: true,
        format: 'umd',
        name: 'DarkReader',
        sourcemap: debug ? 'inline' : false,
    });
}

const bundleAPITask = createTask(
    'bundle-api',
    bundleAPI,
).addWatcher(
    () => {
        return watchFiles;
    },
    async (changedFiles, watcher) => {
        const oldWatchFiles = watchFiles;
        await bundleAPI({debug: true, watch: true});

        watcher.unwatch(
            oldWatchFiles.filter((oldFile) => !watchFiles.includes(oldFile))
        );
        watcher.add(
            watchFiles.filter((newFile) => oldWatchFiles.includes(newFile))
        );
    },
);

export default bundleAPITask;
