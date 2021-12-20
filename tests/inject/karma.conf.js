import fs from 'fs-extra';
import os from 'os';
import rollupPluginIstanbul from 'rollup-plugin-istanbul2';
import rollupPluginNodeResolve from '@rollup/plugin-node-resolve';
import rollupPluginReplace from '@rollup/plugin-replace';
import rollupPluginTypescript from 'rollup-plugin-typescript2';
import typescript from 'typescript';

export default (config) => {
    config.set({
        basePath: './',
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
                                'offscreencanvas'
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
