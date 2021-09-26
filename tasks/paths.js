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
    }
};
