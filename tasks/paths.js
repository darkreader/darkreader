module.exports = {
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
