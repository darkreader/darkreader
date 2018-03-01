const gulpZip = require('gulp-zip');
const {getDestDir} = require('./paths');

module.exports = function createZipTasks(gulp) {
    const dir = getDestDir({production: true});
    const firefoxDir = getDestDir({production: true, firefox: true});

    gulp.task('zip', () => {
        gulp.src(`${dir}/**/*.*`, {base: dir})
            .pipe(gulpZip('build.zip'))
            .pipe(gulp.dest('./'));
    });

    gulp.task('zip-firefox', () => {
        gulp.src(`${firefoxDir}/**/*.*`, {base: firefoxDir})
            .pipe(gulpZip('build-firefox.zip'))
            .pipe(gulp.dest('./'));
    });
};
