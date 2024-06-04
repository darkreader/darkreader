// @ts-check
import less from 'less';
import path from 'node:path';
import {getDestDir, absolutePath} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {readFile, writeFile} from './utils.js';

/** @typedef {import('chokidar').FSWatcher} FSWatcher */
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

async function bundleCSSEntry(entry) {
    const src = absolutePath(entry.src);
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

/**
 * @param {CSSEntry} entry
 * @returns {string}
 */
function getEntryFile(entry) {
    return absolutePath(entry.src);
}

/**
 * @param {CSSEntry[]} cssEntries
 * @returns {ReturnType<typeof createTask>}
 */
export function createBundleCSSTask(cssEntries) {
    /** @type {string[]} */
    let currentWatchFiles;

    const getWatchFiles = () => {
        const watchFiles = new Set();
        cssEntries.forEach((entry) => {
            entry.watchFiles?.forEach((file) => watchFiles.add(file));
            const entryFile = getEntryFile(entry);
            if (!watchFiles.has(entryFile)) {
                watchFiles.add(entryFile);
            }
        });
        currentWatchFiles = Array.from(watchFiles);
        return currentWatchFiles;
    };

    const bundleCSS = async ({platforms, debug}) => {
        for (const entry of cssEntries) {
            const css = await bundleCSSEntry(entry);
            await writeFiles(entry.dest, platforms, debug, css);
        }
    };

    /** @type {(changedFiles: string[], watcher: FSWatcher, platforms: any) => Promise<void>} */
    const onChange = async (changedFiles, watcher, platforms) => {
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
            currentWatchFiles.filter((oldFile) => !newWatchFiles.includes(oldFile))
        );
        watcher.add(
            newWatchFiles.filter((newFile) => currentWatchFiles.includes(newFile))
        );

        reload.reload({type: reload.CSS});
    };

    return createTask(
        'bundle-css',
        bundleCSS,
    ).addWatcher(
        () => {
            currentWatchFiles = getWatchFiles();
            return currentWatchFiles;
        },
        onChange,
    );
}

export default createBundleCSSTask(cssEntries);
