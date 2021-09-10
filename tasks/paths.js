module.exports = {
    PLATFORM: {
        CHROME: 'chrome',
        FIREFOX: 'firefox',
        THUNDERBIRD: 'thubderbird',
    },
    getDestDir: function ({debug, platform}) {
        const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
        return `${buildTypeDir}/${platform}`;
    }
};
