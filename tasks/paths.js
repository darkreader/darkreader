module.exports = {
    PLATFORM: {
        CHROME: 'chrome',
        FIREFOX: 'firefox',
        THUNDERBIRD: 'thunderbird',
    },
    getDestDir: function ({debug, platform}) {
        const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
        return `${buildTypeDir}/${platform}`;
    }
};
