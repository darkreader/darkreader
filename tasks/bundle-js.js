const fs = require('fs-extra');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {PORT} = reload;
const {createTask} = require('./task');
const {build, buildSync} = require('esbuild');

async function copyToBrowsers({cwdPath, debug}) {
    const destPath = `${getDestDir({debug})}/${cwdPath}`;
    const ffDestPath = `${getDestDir({debug, firefox: true})}/${cwdPath}`;
    const tbDestPath = `${getDestDir({debug, thunderbird: true})}/${cwdPath}`;
    await fs.copy(destPath, ffDestPath);
    await fs.copy(destPath, tbDestPath);
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
 * @property {{watchFiles: string[], bundle: import('esbuild').BuildIncremental, collectDependencies: () => string[]}} watchInfo
 */

/** @type {JSEntry[]} */
const jsEntries = [
    {
        src: 'src/background/index.ts',
        dest: 'background/index.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            const destPath = `${getDestDir({debug})}/${this.dest}`;
            const ffDestPath = `${getDestDir({debug, firefox: true})}/${this.dest}`;
            const tbDestPath = `${getDestDir({debug, thunderbird: true})}/${this.dest}`;
            const code = await fs.readFile(destPath, 'utf8');
            const patchedCode = patchFirefoxJS(code);
            await fs.outputFile(ffDestPath, patchedCode);
            await fs.copy(ffDestPath, tbDestPath);
        },
        watchInfo: {
            watchFiles: null,
            bundle: null,
            collectDependencies: null,
        },
    },
    {
        src: 'src/inject/index.ts',
        dest: 'inject/index.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchInfo: {
            watchFiles: null,
            bundle: null,
            collectDependencies: null,
        },
    },
    {
        src: 'src/inject/fallback.ts',
        dest: 'inject/fallback.js',
        reloadType: reload.FULL,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchInfo: {
            watchFiles: null,
            bundle: null,
            collectDependencies: null,
        },
    },
    {
        src: 'src/ui/devtools/index.tsx',
        dest: 'ui/devtools/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchInfo: {
            watchFiles: null,
            bundle: null,
            collectDependencies: null,
        },
    },
    {
        src: 'src/ui/popup/index.tsx',
        dest: 'ui/popup/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchInfo: {
            watchFiles: null,
            bundle: null,
            collectDependencies: null,
        },
    },
    {
        src: 'src/ui/stylesheet-editor/index.tsx',
        dest: 'ui/stylesheet-editor/index.js',
        reloadType: reload.UI,
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
        watchInfo: {
            watchFiles: null,
            bundle: null,
            collectDependencies: null,
        },
    },
];

const collectDependencies = (src, dest) => {
    return {
        dependencies: () => {
            const result = buildSync({
                entryPoints: [src],
                outfile: dest,
                write: false,
                bundle: true,
                metafile: 'meta.json',
                format: 'iife',
                sourcemap: 'inline',
                target: 'es2019',
                charset: 'utf8',
                metafile: 'meta.json',
                define: {
                    '__DEBUG__': 'false',
                    '__PORT__': '-1',
                    '__WATCH__': 'false',
                }
            });
            const metaEntry = JSON.parse(result.outputFiles.find((entry) => entry.path.endsWith('meta.json')).text);
            return Object.keys(metaEntry.inputs);
        }
    };
};
async function bundleJS(/** @type {JSEntry} */entry, {debug, watch}) {
    const {src, dest} = entry;
    const outfile = `${getDestDir({debug})}/${dest}`;
    const bundle = await build({
        incremental: watch ? true : false,
        sourcemap: debug ? 'inline' : false,
        bundle: true,
        target: 'es2019',
        charset: 'utf8',
        format: 'iife',
        write: true,
        outfile,
        entryPoints: [src],
        treeShaking: true,
        define: {
            '__DEBUG__': debug ? 'true' : 'false',
            '__PORT__': watch ? String(PORT) : '-1',
            '__WATCH__': watch ? 'true' : 'false',
        },
        minifySyntax: true,
        banner: '"use strict";'

    });
    if (watch) {
        const collectFunction = collectDependencies(src, outfile);
        entry.watchInfo.bundle = bundle;
        entry.watchInfo.watchFiles = collectFunction.dependencies();
        entry.watchInfo.collectDependencies = collectFunction.dependencies;
    }
    await entry.postBuild({debug});
}

function getWatchFiles() {
    const watchFiles = new Set();
    jsEntries.forEach((entry) => {
        entry.watchInfo.watchFiles.forEach((file) => watchFiles.add(file));
    });
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
            return changedFiles.some((changed) => {
                return entry.watchInfo.watchFiles.includes(changed);
            });
        });
        await Promise.all(
            entries.map((entry) => {
                entry.watchInfo.bundle.rebuild();
                entry.watchInfo.watchFiles = entry.watchInfo.collectDependencies();
            })
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
