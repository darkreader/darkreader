const {dirname, join} = require('path');
const packageJson = require.resolve('../package.json');
const rootDir = dirname(packageJson);
const rootPath = (...paths) => join(rootDir, ...paths);

module.exports = {
    PLATFORM: {
        CHROME: 'chrome',
        CHROME_MV3: 'chrome-mv3',
        FIREFOX: 'firefox',
        THUNDERBIRD: 'thunderbird',
    },
    getDestDir: function ({debug, platform}) {
        const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
        return `${buildTypeDir}/${platform}`;
    },
    getTestDestDir: function () {
        return `build/tests`;
    },

    rootDir,
    rootPath,
};
