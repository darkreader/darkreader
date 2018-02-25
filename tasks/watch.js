const gulpConnect = require('gulp-connect');
const runSequence = require('run-sequence');
const {getDestDir} = require('./paths');

module.exports = function createWatchTask(gulp) {
    gulp.task('js-debug-reload', (done) => runSequence('js-debug', 'reload', done));
    gulp.task('css-debug-reload', (done) => runSequence('css-debug', 'reload', done));

    gulp.task('watch', ['js-debug', 'css-debug', 'copy-debug'], () => {
        gulp.watch(['src/**/*.ts', 'src/**/*.tsx'], ['js-debug-reload']);
        gulp.watch(['src/**/*.less'], ['css-debug-reload']);

        gulpConnect.server({
            host: '0.0.0.0',
            port: 2014,
            root: `./${getDestDir({production: false})}/ui/`,
            livereload: true,
        });
    });
};
