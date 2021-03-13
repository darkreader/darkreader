const fs = require('fs-extra');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {PORT} = reload;
const {createTask} = require('./task');
const {build} = require('esbuild');

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
 */

/** @type {JSEntry[]} */
const jsEntries = [
    {
        src: 'src/background/index.ts',
        dest: 'background/index.js',
        async postBuild({debug}) {
            const destPath = `${getDestDir({debug})}/${this.dest}`;
            const ffDestPath = `${getDestDir({debug, firefox: true})}/${this.dest}`;
            const tbDestPath = `${getDestDir({debug, thunderbird: true})}/${this.dest}`;
            const code = await fs.readFile(destPath, 'utf8');
            const patchedCode = patchFirefoxJS(code);
            await fs.outputFile(ffDestPath, patchedCode);
            await fs.copy(ffDestPath, tbDestPath);
        },
    },
    {
        src: 'src/inject/index.ts',
        dest: 'inject/index.js',
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
    },
    {
        src: 'src/inject/fallback.ts',
        dest: 'inject/fallback.js',
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
    },
    {
        src: 'src/ui/devtools/index.tsx',
        dest: 'ui/devtools/index.js',
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
    },
    {
        src: 'src/ui/popup/index.tsx',
        dest: 'ui/popup/index.js',
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
    },
    {
        src: 'src/ui/stylesheet-editor/index.tsx',
        dest: 'ui/stylesheet-editor/index.js',
        async postBuild({debug}) {
            await copyToBrowsers({cwdPath: this.dest, debug});
        },
    },
];

async function bundleJS(/** @type {JSEntry} */entry, {debug, watch}) {
    const {src, dest} = entry;
    const outfile = `${getDestDir({debug})}/${dest}`;
    await build({
        incremental: watch ? true : false,
        watch: watch ? {
            onRebuild(error) {
                if (error) {
                    console.error('watch build failed:', error);
                } else {
                    reload({type: reload.FULL});
                    console.error('watch build succeeded');
                }
            },
        } : null,
        sourcemap: debug ? 'inline' : false,
        bundle: true,
        platform: 'browser',
        target: 'es2019',
        charset: 'utf8',
        format: 'iife',
        write: true,
        outfile,
        entryPoints: [src],
        define: {
            '__DEBUG__': debug ? 'true' : 'false',
            '__PORT__': watch ? String(PORT) : '-1',
            '__WATCH__': watch ? 'true' : 'false',
        },
        minifySyntax: true,
        banner: {js: '"use strict";'},
        // To properly configure malevic imports.
        // We need to set custom paths.
        // So that ESBuild will pick up the right files.
        tsconfig: './tasks/custom-tsconfig.json',

    });
    await entry.postBuild({debug});
}

module.exports = createTask(
    'bundle-js',
    async ({debug, watch}) => jsEntries.forEach(async (entry) => await bundleJS(entry, {debug, watch}))
);
