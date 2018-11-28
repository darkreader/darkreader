const chokidar = require('chokidar');
const bundleCSS = require('./bundle-css');
const bundleHtml = require('./bundle-html');
const bundleJS = require('./bundle-js');
const bundleLocales = require('./bundle-locales');
const copy = require('./copy');
const foxify = require('./foxify');
const reload = require('./reload');
const {runTasks, log} = require('./utils');

const DEBOUNCE = 200;

const watchers = [
    [['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js'], [
        bundleJS,
        foxify,
        bundleHtml,
    ]],
    [['src/**/*.less'], [
        bundleCSS,
    ]],
    [['src/**/*.html'], [
        bundleHtml,
    ]],
    [['src/_locales/**/*.config'], [
        bundleLocales,
    ]],
    [['src/config/**/*.config', 'src/*.json', 'src/ui/assets/**/*.*'], [
        copy,
        foxify,
    ]],
];

function watch(options) {
    function observe(files, tasks) {
        const queue = new Set();
        let timeoutId = null;

        function onChange(path) {
            queue.add(path);
            if (!timeoutId) {
                timeoutId = setTimeout(async () => {
                    timeoutId = null;
                    try {
                        log.ok(`Files changed:${Array.from(queue).sort().map((path) => `\n${path}`)}`);
                        queue.clear();
                        await runTasks(tasks, options);
                        if (timeoutId) {
                            return;
                        }
                        reload();
                    } catch (err) {
                        log.error(err);
                    }
                }, DEBOUNCE);
            }
        }

        const watcher = chokidar.watch(files, {ignoreInitial: true})
            .on('add', onChange)
            .on('change', onChange)
            .on('unlink', onChange);

        function closeWatcher() {
            watcher.close();
        }

        process.on('exit', closeWatcher);
        process.on('SIGINT', closeWatcher);
    }

    watchers.forEach(([paths, tasks]) => observe(paths, tasks));
}

module.exports = watch;
