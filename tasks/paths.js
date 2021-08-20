module.exports = {
    getDestDir: function ({debug, firefox, thunderbird}) {
        const browser = thunderbird ? 'thunderbird' : firefox ? 'firefox' : 'chrome';
        const buildTypeDir = `build/${debug ? 'debug' : 'release'}`;
        return `${buildTypeDir}/${browser}`;
    }
};
