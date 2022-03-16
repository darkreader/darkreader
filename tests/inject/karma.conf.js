const fs = require('fs');
const os = require('os');
const rollupPluginIstanbul = require('rollup-plugin-istanbul2');
const rollupPluginNodeResolve = require('@rollup/plugin-node-resolve').default;
const rollupPluginReplace = require('@rollup/plugin-replace');
const rollupPluginTypescript = require('@rollup/plugin-typescript');
const typescript = require('typescript');
const {getTestDestDir, rootPath} = require('../../tasks/paths');

/**
 * @param   {import('karma').Config} config
 * @returns {import('karma').ConfigOptions}
 */
function configureKarma(config) {
    const headless = config.headless || process.env.KARMA_HEADLESS || false;

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
        browsers: headless
            ? ['ChromeHeadless', 'FirefoxHeadless']
            : ['Chrome', 'Firefox', process.platform === 'darwin' ? 'Safari' : null].filter(Boolean),
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
        options.customLaunchers = {};
        options.browsers = [];
        if (process.env.CHROME_BIN) {
            options.customLaunchers['CIChromeHeadless'] = {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--disable-setuid-sandbox']
            };
            options.browsers.push('CIChromeHeadless');
        }
        if (process.env.FIREFOX_BIN) {
            options.customLaunchers['CIFirefoxHeadless'] = {base: 'FirefoxHeadless'};
            options.browsers.push('CIFirefoxHeadless');
        }
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
 * @param   {import('karma').Config} config
 * @returns {void}
 */
module.exports = (config) => {
    config.set(configureKarma(config));
};
