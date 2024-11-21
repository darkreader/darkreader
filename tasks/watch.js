import {watch as chokidarWatch} from 'chokidar';

import {log} from './utils.js';

const DEBOUNCE = 200;

/**
 * @param {Object} options
 * @param {string[]} options.files
 * @param {(files: string[]) => void | Promise<void>} options.onChange
 */
function watch(options) {
    const queue = new Set();
    let timeoutId = null;

    function onChange(path) {
        queue.add(path);

        if (timeoutId !== null) {
            return;
        }

        timeoutId = setTimeout(async () => {
            timeoutId = null;
            try {
                const changedFiles = Array.from(queue).sort();
                log.ok(`Files changed:${changedFiles.map((path) => `\n${path}`)}`);
                queue.clear();
                await options.onChange(changedFiles);
            } catch (err) {
                log.error(err);
            }
        }, DEBOUNCE);
    }

    const watcher = chokidarWatch(options.files, {ignoreInitial: true})
        .on('add', onChange)
        .on('change', onChange)
        .on('unlink', onChange);

    function stop() {
        watcher.close();
    }

    process.on('exit', stop);
    process.on('SIGINT', stop);

    return watcher;
}

export default watch;
