// @ts-check
import less from 'less';
import path from 'node:path';
import {getDestDir, rootPath} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {readFile, writeFile} from './utils.js';

/** @typedef {import('./types').CSSEntry} CSSEntry */

/** @type {CSSEntry[]} */
const cssEntries = [
    {
        src: 'src/ui/devtools/style.less',
        dest: 'ui/devtools/style.css',
    },
    {
        src: 'src/ui/options/style.less',
        dest: 'ui/options/style.css',
    },
    {
        src: 'src/ui/popup/style.less',
        dest: 'ui/popup/style.css',
    },
    {
        src: 'src/ui/stylesheet-editor/style.less',
        dest: 'ui/stylesheet-editor/style.css',
    },
];

/** @type {string[]} */
let watchFiles;

async function bundleCSSEntry(entry) {
    const src = rootPath(entry.src);
    const srcDir = path.dirname(src);
    const input = await readFile(src);
    const output = await less.render(input, {paths: [srcDir], math: 'always'});
    entry.watchFiles = output.imports;
    return output.css;
}

async function writeFiles(dest, platforms, debug, css) {
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const platform of enabledPlatforms) {
        const dir = getDestDir({debug, platform});
        await writeFile(`${dir}/${dest}`, css);
    }
}

async function bundleCSS({platforms, debug}) {
    for (const entry of cssEntries) {
        const css = await bundleCSSEntry(entry);
        await writeFiles(entry.dest, platforms, debug, css);
    }
}

/**
 * @param {CSSEntry} entry
 * @returns {string}
 */
function getEntryFile(entry) {
    return rootPath(entry.src);
}

function getWatchFiles() {
    const watchFiles = new Set();
    cssEntries.forEach((entry) => {
        entry.watchFiles?.forEach((file) => watchFiles.add(file));
        const entryFile = getEntryFile(entry);
        if (!watchFiles.has(entryFile)) {
            watchFiles.add(entryFile);
        }
    });
    return Array.from(watchFiles);
}

const bundleCSSTask = createTask(
    'bundle-css',
    bundleCSS,
).addWatcher(
    () => {
        watchFiles = getWatchFiles();
        return watchFiles;
    },
    async (changedFiles, watcher, platforms) => {
        const entries = cssEntries.filter((entry) => {
            const entryFile = getEntryFile(entry);
            return changedFiles.some((changed) => {
                return entry.watchFiles?.includes(changed) || changed === entryFile;
            });
        });
        for (const entry of entries) {
            const css = await bundleCSSEntry(entry);
            await writeFiles(entry.dest, platforms, true, css);
        }

        const newWatchFiles = getWatchFiles();
        watcher.unwatch(
            watchFiles.filter((oldFile) => !newWatchFiles.includes(oldFile))
        );
        watcher.add(
            newWatchFiles.filter((newFile) => watchFiles.includes(newFile))
        );

        reload.reload({type: reload.CSS});
    },
);

export default bundleCSSTask;
