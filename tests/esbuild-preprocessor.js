const esbuild = require('esbuild');
const path = require('path');

function createPreprocessor(config, emitter, logger) {
    const log = logger.create('esbuild');
    const transformPath = (filepath) => filepath.replace(/\.ts$/, '.js');
    const DEBOUNCE_TIMEOUT = 250;

    function debounce(fn, delay) {
        let timeoutId = null;
        return ((...args) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                timeoutId = null;
                fn(...args);
            }, delay);
        });
    }
    const watchMode = !config.singleRun && config.autoWatch;
    const onWatchChange = debounce(() => {
        emitter.refreshFiles();
        console.log('watch build succeeded');
    }, DEBOUNCE_TIMEOUT);

    const watch = watchMode ? {
        onRebuild(error, result) {
            if (error) {
                console.error('watch build failed:', error);
            } else if (result) {
                onWatchChange();
            }
        }
    } : false;

    const base = config.basePath || process.cwd();

    /**
     * @param {string[]} files
     */
    async function build(files) {
        const result = await esbuild.build({
            entryPoints: files,
            write: false,
            bundle: true,
            sourcemap: 'external',
            target: 'es2019',
            charset: 'utf8',
            outdir: base,
            watch,
            define: {
                '__DEBUG__': 'false',
                '__PORT__': '-1',
                '__WATCH__': 'false',
            },
            banner: {js: '"use strict";'},
        });
        return result;
    }

    let stopped = false;

    return async function preprocess(_, file, done) {
        file.path = transformPath(file.originalPath);
        const originalPath = file.originalPath;

        try {
            log.info('Generating code for ./%s', originalPath);
            const result = await build([originalPath]);
            const map = result.outputFiles[0];
            const mapText = JSON.parse(map.text);
            mapText.sources = mapText.sources.map((source) => path.join(base, source));
            const source = result.outputFiles[1];

            file.sourceMap = mapText;
            done(null, source.text);
        } catch (err) {
            // Use a non-empty string because `karma-sourcemap` crashes
            // otherwse.
            const dummy = `(function () {})()`;
            // Prevent flood of error logs when we shutdown
            if (stopped) {
                done(null, dummy);
                return;
            }
            log.error(err.message);

            if (watchMode) {
                // Never return an error in watch mode, otherwise the
                // watcher will shutdown.
                // Use a dummy file instead because the original content
                // may content syntax not supported by a browser or the
                // way the script was loaded. This breaks the watcher too.
                done(null, dummy);
            } else {
                done(err, null);
            }
        }
    };
}

createPreprocessor.$inject = ['config', 'emitter', 'logger'];

module.exports = {
    'preprocessor:esbuild': ['factory', createPreprocessor],
};
