const fs = require('fs-extra');
const os = require('os');
const rollupPluginIstanbul = require('rollup-plugin-istanbul2');
const rollupPluginNodeResolve = require('@rollup/plugin-node-resolve').default;
const rollupPluginReplace = require('@rollup/plugin-replace');
const rollupPluginTypescript = require('rollup-plugin-typescript2');
const typescript = require('typescript');

module.exports = (config) => {
    config.set({
        basePath: '../../',
        frameworks: ['jasmine'],
        files: [
            'tests/inject/customize.ts',
            'tests/inject/polyfills.ts',
            {pattern: 'tests/inject/**/*.tests.ts', watched: false},
        ],
        preprocessors: {
            '**/*.+(ts|tsx)': ['rollup'],
        },
        rollupPreprocessor: {
            plugins: [
                rollupPluginNodeResolve(),
                rollupPluginTypescript({
                    typescript,
                    tsconfig: 'src/tsconfig.json',
                    tsconfigOverride: {
                        compilerOptions: {
                            types: [
                                'chrome',
                                'jasmine',
                            ],
                            removeComments: false,
                            sourceMap: true,
                        },
                    },
                    clean: false,
                    cacheRoot: `${fs.realpathSync(os.tmpdir())}/darkreader_typescript_test_cache`,
                }),
                rollupPluginReplace({
                    preventAssignment: true,
                    '__DEBUG__': 'false',
                    '__PORT__': '-1',
                    '__WATCH__': 'false',
                }),
                rollupPluginIstanbul({
                    exclude: ['tests/**/*.*', 'src/inject/dynamic-theme/stylesheet-proxy.ts'],
                }),
            ],
            output: {
                strict: true,
                format: 'iife',
                sourcemap: 'inline',
            },
        },
        reporters: ['progress', 'coverage'],
        coverageReporter: {
            type: 'html',
            dir: 'tests/inject/coverage/'
        },
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: config.debug ?
            ['Chrome'] :
            ['Chrome', 'Firefox', process.platform === 'darwin' ? 'Safari' : null].filter(Boolean),
        singleRun: config.debug ? false : true,
        concurrency: config.debug ? Infinity : 1,
    });
};
