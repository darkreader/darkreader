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

async function bundleAPI({debug, watch}) {
    const bundle = await rollup.rollup({
        input: './parse.ts',
        plugins: [
            rollupPluginNodeResolve(),
            rollupPluginTypescript({
//                rootDir,
                typescript,
                tsconfig: './tsconfig.json',
                noImplicitAny: true,
                strictNullChecks: true,
                removeComments: false,
                sourceMap: true,
                inlineSources: true,
                noEmitOnError: false,
            }),
            rollupPluginReplace({
                preventAssignment: true,
                __DEBUG__: false,
                __CHROMIUM_MV2__: false,
                __CHROMIUM_MV3__: false,
                __FIREFOX__: false,
                __THUNDERBIRD__: false,
                __TEST__: false,
            }),
        ].filter((x) => x)
    });
    watchFiles = bundle.watchFiles;
    await bundle.write({
        banner: `/**\n * Dark Reader v${await getVersion()}\n * https://darkreader.org/\n */\n`,
        // TODO: Consider remving next line
        esModule: true,
        file: dest,
        strict: true,
        format: 'umd',
        name: 'DarkReader',
        sourcemap: debug ? 'inline' : false,
    });
}
