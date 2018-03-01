const fs = require('fs-extra');
const {getDestDir} = require('./paths');

module.exports = function createCleanTask(gulp) {
    gulp.task('clean', async () => {
        await fs.remove(getDestDir({production: true}));
        await fs.remove(getDestDir({production: true, firefox: true}));
    });
};
