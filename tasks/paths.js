module.exports = {
    getDestDir: function ({debug, firefox}) {
        if (firefox) {
            return debug ? 'debug-firefox' : 'build-firefox';
        }
        return debug ? 'debug' : 'build' ;
    }
};
