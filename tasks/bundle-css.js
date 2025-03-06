// @ts-check
import path from 'node:path';

import less from 'less';

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

async function bundleCSSEntry(entry, plus) {
    const src = absolutePath(entry.src);
    const srcDir = path.dirname(src);

    let input = await readFile(src);
    if (!plus) {
        const startToken = '/* @plus-start */';
        const endToken = '/* @plus-end */';
        const startIndex = input.indexOf(startToken);
        const endIndex = input.indexOf(endToken, startIndex);
        if (startIndex >= 0 && endIndex >= 0) {
            input = input.substring(0, startIndex) + input.substring(endIndex + endToken.length);
        }
    }

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
            for (const platform in platforms) {
                if (!platforms[platform]) {
                    continue;
                }
                const css = await bundleCSSEntry(entry, platform === PLATFORM.CHROMIUM_MV2_PLUS);
                await writeFiles(entry.dest, {[platform]: true}, debug, css);
            }
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
            const css = await bundleCSSEntry(entry, true);
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
