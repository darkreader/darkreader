const runSequence = require('run-sequence');
const { getDestDir } = require('./paths');
const { logError } = require('./utils');

module.exports = function createWatchTask(gulp) {
    gulp.task('js-debug-reload', (done) => runSequence('js-debug', 'reload', done));
    gulp.task('css-debug-reload', (done) => runSequence('css-debug', 'reload', done));

    gulp.task('watch', ['js-debug', 'css-debug', 'copy-debug'], () => {
        gulp.watch(['src/**/*.ts', 'src/**/*.tsx'], ['js-debug-reload']).on('error', logError);
        gulp.watch(['src/**/*.less'], ['css-debug-reload']).on('error', logError);
    });
};
