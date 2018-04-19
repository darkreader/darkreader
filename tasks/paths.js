module.exports = {
    getDestDir: function ({production, firefox}) {
        if (firefox) {
            return production ? 'build-firefox' : 'debug-firefox';
        }
        return production ? 'build' : 'debug';
    }
};
