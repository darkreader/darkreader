const fs = require('fs-extra');
const os = require('os');
const rollup = require('rollup');
const rollupPluginCommonjs = require('rollup-plugin-commonjs');
const rollupPluginNodeResolve = require('rollup-plugin-node-resolve');
const rollupPluginReplace = require('rollup-plugin-replace');
const rollupPluginTypescript = require('rollup-plugin-typescript2');
const typescript = require('typescript');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {PORT} = reload;
const {createTask} = require('./task');

async function copyToFF({cwdPath, production}) {
    const destPath = `${getDestDir({production})}/${cwdPath}`;
    const ffDestPath = `${getDestDir({production, firefox: true})}/${cwdPath}`;
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
 * @property {({production}) => Promise<void>} postBuild
 * @property {string[]} watchFiles
 */

/** @type {JSEntry[]} */
const jsEntries = [
    {
        src: 'src/background/index.ts',
        dest: 'background/index.js',
        reloadType: reload.FULL,
        async postBuild({production}) {
            const destPath = `${getDestDir({production})}/${this.dest}`;
            const ffDestPath = `${getDestDir({production, firefox: true})}/${this.dest}`;
            const code = await fs.readFile(destPath, 'utf8');
            await fs.outputFile(ffDestPath, patchFirefoxJS(code));
        },
        watchFiles: null,
    },
    {
        src: 'src/inject/index.ts',
        dest: 'inject/index.js',
        reloadType: reload.FULL,
        async postBuild({production}) {
            await copyToFF({cwdPath: this.dest, production});
        },
        watchFiles: null,
    },
    {
        src: 'src/ui/devtools/index.tsx',
        dest: 'ui/devtools/index.js',
        reloadType: reload.UI,
        async postBuild({production}) {
            await copyToFF({cwdPath: this.dest, production});
        },
        watchFiles: null,
    },
    {
        src: 'src/ui/popup/index.tsx',
        dest: 'ui/popup/index.js',
        reloadType: reload.UI,
        async postBuild({production}) {
            await copyToFF({cwdPath: this.dest, production});
        },
        watchFiles: null,
    },
    {
        src: 'src/ui/stylesheet-editor/index.tsx',
        dest: 'ui/stylesheet-editor/index.js',
        reloadType: reload.UI,
        async postBuild({production}) {
            await copyToFF({cwdPath: this.dest, production});
        },
        watchFiles: null,
    },
];

async function bundleJS(/** @type {JSEntry} */entry, {production}) {
    const {src, dest} = entry;
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
    entry.watchFiles = bundle.watchFiles;
    await bundle.write({
        file: `${getDestDir({production})}/${dest}`,
        strict: true,
        format: 'iife',
        sourcemap: production ? false : 'inline',
    });
    await entry.postBuild({production});
}

function getWatchFiles() {
    const watchFiles = new Set();
    jsEntries.forEach((entry) => {
        entry.watchFiles.forEach((file) => watchFiles.add(file));
    });
    return Array.from(watchFiles);
}

/** @type {string[]} */
let watchFiles;

module.exports = createTask(
    'bundle-js',
    async ({production}) => await Promise.all(
        jsEntries.map((entry) => bundleJS(entry, {production}))
    ),
).addWatcher(
    () => {
        watchFiles = getWatchFiles();
        return watchFiles;
    },
    async (changedFiles, watcher) => {
        const entries = jsEntries.filter((entry) => {
            return changedFiles.some((changed) => {
                return entry.watchFiles.includes(changed);
            });
        });
        await Promise.all(
            entries.map((e) => bundleJS(e, {production: false}))
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
