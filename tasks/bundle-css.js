// @ts-check
import less from 'less';
import path from 'node:path';
import paths from './paths.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {readFile, writeFile} from './utils.js';
const {getDestDir, PLATFORM, rootPath} = paths;

/**
 * @typedef CSSEntry
 * @property {string} src
 * @property {string} dest
 * @property {string[]} [watchFiles]
 */

/** @type {CSSEntry[]} */
const cssEntries = [
    {
        src: 'src/ui/devtools/style.less',
        dest: 'ui/devtools/style.css',
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
    const srcDir = path.dirname(rootPath(entry.src));
    const input = await readFile(entry.src);
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

function getWatchFiles() {
    const watchFiles = new Set();
    cssEntries.forEach((entry) => {
        entry.watchFiles?.forEach((file) => watchFiles.add(file));
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
        const entries = cssEntries.filter((entry) => changedFiles.some((changed) => entry.watchFiles?.includes(changed)));
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
