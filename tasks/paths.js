module.exports = {
    getDestDir: function ({production}) {
        return production ? 'build' : 'debug';
    }
};
