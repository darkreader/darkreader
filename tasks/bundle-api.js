const packageJSON = require('../package.json');
const {build} = require('esbuild');
const {createTask} = require('./task');

async function bundleAPI() {
    const src = ['src/api/index.ts'];
    const dest = 'darkreader.js';

    await build({
        incremental: false,
        entryPoints: src,
        outfile: dest,
        bundle: true,
        define: {
            '__DEBUG__': false,
        },
        target: 'es2015',
        charset: 'utf8',
        banner: {js: `/**\n * Dark Reader v${packageJSON.version}\n * https://darkreader.org/\n */\n"use strict";`},
        format: 'iife',
        sourcemap: false,
        globalName: 'DarkReader',
        treeShaking: true,
        minifySyntax: true,
    });
}

module.exports = createTask(
    'bundle-api',
    bundleAPI,
);
