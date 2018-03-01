module.exports = {
    getDestDir: function ({production, firefox}) {
        if (production && firefox) {
            return 'build-firefox';
        }
        return production ? 'build' : 'debug';
    }
};
