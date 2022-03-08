// @ts-check
const fs = require('fs');
const os = require('os');
const rollupPluginIstanbul = require('rollup-plugin-istanbul2');
const rollupPluginNodeResolve = require('@rollup/plugin-node-resolve').default;
const typescript = require('typescript');
const {getTestDestDir, rootPath} = require('../../tasks/paths');

/**
 * @typedef {import('karma').Config} Config
 * @typedef {import('karma').ConfigOptions} ConfigOptions
 * @typedef {import('rollup').Plugin} RollupPlugin
 * @typedef {import('@rollup/plugin-typescript').RollupTypescriptPluginOptions} RollupTypescriptPluginOptions
 * @typedef {import('@rollup/plugin-replace').RollupReplaceOptions} RollupReplaceOptions
 */

/** @type {(options?: RollupReplaceOptions) => RollupPlugin} */
// @ts-ignore
const rollupPluginReplace = require('@rollup/plugin-replace');
/** @type {(options?: RollupTypescriptPluginOptions) => RollupPlugin} */
// @ts-ignore
const rollupPluginTypescript = require('@rollup/plugin-typescript');

/**
 * @param   {Config} config
 * @returns {ConfigOptions}
 */
function configureKarma(config) {
    /**
     * @type {ConfigOptions}
     */
    let options = {
        basePath: '../..',
        frameworks: ['jasmine'],
        files: [
            'tests/inject/support/customize.ts',
            'tests/inject/support/polyfills.ts',
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
                    tsconfig: rootPath('tests/inject/tsconfig.json'),
                    cacheDir: `${fs.realpathSync(os.tmpdir())}/darkreader_typescript_test_cache`,
                }),
                rollupPluginReplace({
                    preventAssignment: true,
                    '__DEBUG__': 'false',
                    '__PORT__': '-1',
                    '__WATCH__': 'false',
                }),
            ],
            output: {
                dir: getTestDestDir(),
                strict: true,
                format: 'iife',
                sourcemap: 'inline',
            },
        },
        reporters: ['spec'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome', 'Firefox', process.platform === 'darwin' ? 'Safari' : null].filter(Boolean),
        singleRun: true,
        concurrency: 1,
    };

    if (config.debug) {
        options.browsers = ['Chrome'];
        options.singleRun = false;
        options.concurrency = Infinity;
        options.logLevel = config.LOG_DEBUG;
    }

    if (config.ci) {
        const {CI_BUILD_CONTEXT, CHROME_BIN, FIREFOX_BIN} = process.env;
        const configureCIBrowsers = require('./karma.conf.ci');
        options = {...options, ...configureCIBrowsers(CI_BUILD_CONTEXT, {CHROME_BIN, FIREFOX_BIN})};
        options.autoWatch = false;
        options.singleRun = true;
        options.concurrency = 1;
        options.logLevel = config.LOG_DEBUG;
    }

    if (config.coverage) {
        const plugin = rollupPluginIstanbul({
            exclude: ['tests/**/*.*', 'src/inject/dynamic-theme/stylesheet-proxy.ts'],
        });
        options.rollupPreprocessor.plugins.push(plugin);
        options.reporters.push('coverage');
        options.coverageReporter = {
            type: 'html',
            dir: 'tests/inject/coverage/'
        };
    }

    return options;
}

/**
 * @param   {Config} config
 * @returns {void}
 */
module.exports = (config) => {
    config.set(configureKarma(config));
};
