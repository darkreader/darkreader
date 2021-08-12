const chokidar = require('chokidar');
const {log} = require('./utils');

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

        if (timeoutId != null) {
            return;
        }

        timeoutId = setTimeout(async () => {
            timeoutId = null;
            try {
                const changedFiles = Array.from(queue).sort();
                log.ok(`Files changed:${changedFiles.map((path) => `\n${path}`)}`);
                queue.clear();
                await options.onChange(changedFiles);
                if (timeoutId) {
                    return;
                }
            } catch (err) {
                log.error(err);
            }
        }, DEBOUNCE);
    }

    const watcher = chokidar.watch(options.files, {ignoreInitial: true})
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

module.exports = watch;
