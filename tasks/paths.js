module.exports = {
    /**
     * @param {Object} obj
     * @param {boolean} obj.debug
     * @param {boolean} [obj.firefox]
     * @param {boolean} [obj.thunderbird]
     * @returns {string}
     */
    getDestDir: function ({debug, firefox, thunderbird}) {
        if (thunderbird) {
            return debug ? 'debug-thunderbird' : 'build-thunderbird';
        }
        if (firefox) {
            return debug ? 'debug-firefox' : 'build-firefox';
        }
        return debug ? 'debug' : 'build' ;
    }
};
