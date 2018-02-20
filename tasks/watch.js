const runSequence = require('run-sequence');
const { getDestDir } = require('./paths');

module.exports = function createWatchTask(gulp) {
    gulp.task('js-debug-reload', (done) => {
        runSequence('js-debug', 'reload', done);
    });

    gulp.task('watch', ['js-debug', 'copy-debug'], () => {
        gulp.watch(['src/**/*.ts', 'src/**/*.tsx'], ['js-debug-reload']);
    });
};
