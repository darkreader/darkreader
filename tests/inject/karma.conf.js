module.exports = (config) => {
    config.set({
        basePath: '../../',
        frameworks: ['jasmine'],
        files: [
            {pattern: 'tests/inject/customize.ts', watched: true, type: 'js'},
            {pattern: 'tests/inject/polyfills.ts', watched: true, type: 'js'},
            {pattern: 'tests/inject/**/*.tests.ts', watched: true, type: 'js'},
        ],
        preprocessors: {
            '**/*.+(ts|tsx)': ['esbuild', 'coverage'],
        },
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: config.debug ?
            ['Chrome'] :
            ['Chrome', 'Firefox', process.platform === 'darwin' ? 'Safari' : null].filter(Boolean),
        singleRun: config.debug ? false : true,
        reporters: ['progress', 'coverage'],
        coverageReporter: {
            type: 'html',
            dir: 'tests/inject/coverage/',
        },
        concurrency: config.debug ? Infinity : 1,
        plugins: [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-safari-launcher',
            'karma-jasmine',
            'karma-coverage',
            require('../esbuild-preprocessor')
        ],
    });
};
