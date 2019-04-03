const gulpZip = require('gulp-zip');
const {getDestDir} = require('./paths');

module.exports = function createZipTasks(gulp) {
    const dir = getDestDir({production: true});

    gulp.task('zip', () => {
        gulp.src(`${dir}/**/*.*`, {base: dir})
            .pipe(gulpZip('build.zip'))
            .pipe(gulp.dest('./'));
    });
};
