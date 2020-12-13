const fs = require('fs-extra');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {PORT} = reload;
const {createTask} = require('./task');
const {build} = require('esbuild');
const globby = require('globby');

async function copyToFF({cwdPath, debug}) {
    const destPath = `${getDestDir({debug})}/${cwdPath}`;
    const ffDestPath = `${getDestDir({debug, firefox: true})}/${cwdPath}`;
    await fs.copy(destPath, ffDestPath);
}

function replace(str, find, replace) {
    return str.split(find).join(replace);
}

function patchFirefoxJS(/** @type {string} */code) {
    code = replace(code, 'chrome.fontSettings.getFontList', `chrome['font' + 'Settings']['get' + 'Font' + 'List']`);
    code = replace(code, 'chrome.fontSettings', `chrome['font' + 'Settings']`);
    return code;
}

/**
 * @typedef JSEntry
 * @property {string} src
 * @property {string} dest
 * @property {string} reloadType
 * @property {({debug}) => Promise<void>} postBuild
 * @property {string} watchFiles
 * @property {import('esbuild').BuildIncremental} bundle
 */

// TODO: Make use of the custom metaFile hack in tests/inject/esbuild-preprocessor.js to have an accurate watchFiles.
// NOTE: Only for when watch flag is enabled due to an extra `build` call.

/** @type {JSEntry[]} */
const jsEntries = [
    {
        src: 'src/background/index.ts',
        dest: 'background/index.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            const destPath = `${getDestDir({debug})}/${this.dest}`;
            const ffDestPath = `${getDestDir({debug, firefox: true})}/${this.dest}`;
            const code = await fs.readFile(destPath, 'utf8');
            await fs.outputFile(ffDestPath, patchFirefoxJS(code));
        },
        watchFiles: 'src/background/**',
        bundle: null,
    },
    {
        src: 'src/inject/index.ts',
        dest: 'inject/index.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            await copyToFF({cwdPath: this.dest, debug});
        },
        watchFiles: 'src/inject/!(fallback.ts)**',
        bundle: null,
    },
    {
        src: 'src/inject/fallback.ts',
        dest: 'inject/fallback.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            await copyToFF({cwdPath: this.dest, debug});
        },
        watchFiles: 'src/inject/fallback.ts',
        bundle: null,
    },
    {
        src: 'src/ui/devtools/index.tsx',
        dest: 'ui/devtools/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToFF({cwdPath: this.dest, debug});
        },
        watchFiles: 'src/ui/devtools/**',
        bundle: null,
    },
    {
        src: 'src/ui/popup/index.tsx',
        dest: 'ui/popup/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToFF({cwdPath: this.dest, debug});
        },
        watchFiles: 'src/ui/popup/**',
        bundle: null,
    },
    {
        src: 'src/ui/stylesheet-editor/index.tsx',
        dest: 'ui/stylesheet-editor/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToFF({cwdPath: this.dest, debug});
        },
        watchFiles: 'src/ui/stylesheet-editor/**',
        bundle: null,
    },
];

async function bundleJS(/** @type {JSEntry} */entry, {debug, watch}) {
    const {src, dest} = entry;

    const bundle = await build({
        incremental: watch ? true : false,
        sourcemap: debug ? 'inline' : false,
        bundle: true,
        target: 'es2019',
        charset: 'utf8',
        format: 'iife',
        avoidTDZ: true,
        write: true,
        outfile: `${getDestDir({debug})}/${dest}`,
        entryPoints: [src],
        treeShaking: true,
        define: {
            '__DEBUG__': debug ? 'true' : 'false',
            '__PORT__': watch ? String(PORT) : '-1',
            '__WATCH__': watch ? 'true' : 'false',
        },
    });
    entry.bundle = bundle;
    await entry.postBuild({debug});
}

function getWatchFiles() {
    const watchFiles = new Set();
    jsEntries.forEach((entry) => watchFiles.add(entry.watchFiles));
    return Array.from(watchFiles);
}

/** @type {string[]} */
let watchFiles;

module.exports = createTask(
    'bundle-js',
    async ({debug, watch}) => await Promise.all(
        jsEntries.map((entry) => bundleJS(entry, {debug, watch}))
    ),
).addWatcher(
    () => {
        watchFiles = getWatchFiles();
        return watchFiles;
    },
    async (changedFiles, watcher) => {
        const entries = jsEntries.filter(async (entry) => {
            const watchFiles = await globby(entry.watchFiles);
            return changedFiles.some((changed) => {
                return watchFiles.includes(changed);
            });
        });
        await Promise.all(
            entries.map((e) => e.bundle.rebuild())
        );

        const newWatchFiles = getWatchFiles();
        watcher.unwatch(
            watchFiles.filter((oldFile) => !newWatchFiles.includes(oldFile))
        );
        watcher.add(
            newWatchFiles.filter((newFile) => watchFiles.includes(newFile))
        );

        const isUIOnly = entries.every((entry) => entry.reloadType === reload.UI);
        reload({
            type: isUIOnly ? reload.UI : reload.FULL,
        });
    },
);
