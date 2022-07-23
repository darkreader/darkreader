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
import {copyFile, readFile, writeFile} from './utils.js';
const {rootDir, rootPath} = paths;

const getDestDir = (file) => `build/api/${file}`;

async function getPackage() {
    const file = await readFile('./package.json');
    return JSON.parse(file);
}

async function copyStaticFiles() {
    const files = [
        'index.d.ts',
        'LICENSE',
        'README.md',
    ];
    const promises = [];
    files.forEach((file) => promises.push(copyFile(file, getDestDir(file))));
    await Promise.all(promises);
}

async function bundlePackageManifest(packageManifest) {
    const minimalPackageManifest = {
        ...packageManifest,
        type: undefined,
        scripts: undefined,
        devDependencies: undefined,
    };
    return writeFile(getDestDir('package.json'), JSON.stringify(minimalPackageManifest, null, '  '));
}

async function bundleAPI({debug}) {
    const src = rootPath('src/api/index.ts');
    const dest = getDestDir('darkreader.js');
    const packageManifestPromise = getPackage();
    const bundlePromise = rollup.rollup({
        input: src,
        plugins: [
            rollupPluginNodeResolve(),
            rollupPluginTypescript({
                rootDir,
                typescript,
                tsconfig: rootPath('src/api/tsconfig.json'),
                removeComments: true,
                noEmitOnError: true,
                cacheDir: debug ? `${fs.realpathSync(os.tmpdir())}/darkreader_api_typescript_cache` : undefined,
            }),
            rollupPluginReplace({
                preventAssignment: true,
                '__DEBUG__': 'false',
                '__MV3__': 'false',
                '__TEST__': 'false',
            }),
        ].filter((x) => x)
    });
    const [packageManifest, bundle] = await Promise.all([packageManifestPromise, bundlePromise]);
    const bundleWritePromise = bundle.write({
        banner: `/**\n * Dark Reader v${packageManifest.version}\n * https://darkreader.org/\n */\n`,
        file: dest,
        strict: true,
        format: 'umd',
        name: 'DarkReader',
        sourcemap: false,
    });
    const bundlePackageManifestPromise = bundlePackageManifest(packageManifest);
    const copyStaticFilesPromise = copyStaticFiles();
    await Promise.all([bundleWritePromise, bundlePackageManifestPromise, copyStaticFilesPromise]);
}

const bundleAPITask = createTask(
    'bundle-api',
    bundleAPI,
);

export default bundleAPITask;
