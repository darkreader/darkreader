const path = require('path');
const esbuild = require('esbuild');
const chokidar = require('chokidar');

function createPreprocessor(config, emitter, logger) {
    const log = logger.create('preprocessor.esbuild');

    // Maps each reference file to a Set of entry point files.
    // ELI5 every reference(imports/requires) from the tests files will also get watched.
    // However this is done dynamic for best results and making it not hardcoded
    const reverseDependencies = new Map();

    let registerDependencies = null;

    if (!config.singleRun && config.autoWatch) {
        const patterns = config.files.map((file) => file.pattern);
        const ignored = config.exclude ? config.exclude : null;
        const watcher = chokidar.watch(patterns, {ignored});
        watcher.on('change', (changedPath) => {
            const entryPoints = reverseDependencies.get(changedPath);
            if (entryPoints == null) {
                return;
            }
            for (let entryPoint of entryPoints) {
                if (path.sep !== '/') {
                    entryPoint = entryPoint.replace(/\\/g, '/');
                }
                emitter._fileList.changeFile(entryPoint, true);
            }
        });
        registerDependencies = (entryPoint, dependencies) => {
            for (const dep of dependencies) {
                let revDeps = reverseDependencies.get(dep);
                if (revDeps === undefined) {
                    watcher.add(dep);
                    revDeps = new Set();
                    reverseDependencies.set(dep, revDeps);
                }
                revDeps.add(entryPoint);
            }
        };
    }

    const transformPath = (filepath) => {
        return filepath.replace(/\.ts$/, '.js');
    };


    return async function preprocess(_, file, done) {
        file.path = transformPath(file.originalPath);
        const originalPath = file.originalPath;

        try {
            const outFileKey = 'out.js';
            log.info('Generating code for ./%s', originalPath);
            const result = await esbuild.build({
                entryPoints: [originalPath],
                format: 'iife',
                outfile: outFileKey,
                write: false,
                bundle: true,
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
            /**
             * @type {import('esbuild').Metadata}}
             */
            const metaEntry = JSON.parse(result.outputFiles.find((entry) => entry.path.endsWith('meta.json')).text);
            const dependencies = Object.keys(metaEntry.inputs);
            if (registerDependencies != null) {
                registerDependencies(originalPath, dependencies);
            }
            const outputEntry = result.outputFiles.find((entry) => entry.path.endsWith(outFileKey));
            done(null, outputEntry.text);
        } catch (error) {
            log.error('Failed to produce code for ./%s\n\n%s\n', originalPath, error.stack);
            done(error, null);
        }
    };
}

createPreprocessor.$inject = ['config', 'emitter', 'logger'];

module.exports = {
    'preprocessor:esbuild': ['factory', createPreprocessor],
};
