const packageJSON = require('../package.json');
const {build} = require('esbuild');
const {createTask} = require('./task');

async function bundleAPI({debug}) {
    const src = ['src/api/index.ts'];
    const dest = 'darkreader.js';

    await build({
        incremental: false,
        entryPoints: src,
        outfile: dest,
        bundle: true,
        define: {
            '__DEBUG__': debug
        },
        target: 'es2015',
        avoidTDZ: true,
        charset: 'utf8',
        banner: `/**\n * Dark Reader v${packageJSON.version}\n * https://darkreader.org/\n */\n`,
        format: 'iife',
        sourcemap: false,
        globalName: 'DarkReader',
        treeShaking: true,
    });
}

module.exports = createTask(
    'bundle-api',
    bundleAPI,
);
