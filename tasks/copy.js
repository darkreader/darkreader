const {getDestDir} = require('./paths');

module.exports = function createCopyTasks(gulp) {
    const files = [
        'background/index.html',
        'config/**/*.config',
        'icons/**/*.*',
        'ui/assets/**/*.*',
        'ui/popup/compatibility.js',
        'manifest.json',
    ];

    gulp.task('copy-release', () => {
        gulp.src(files, {base: 'src', cwd: 'src'})
            .pipe(gulp.dest(getDestDir({production: true})));
    });

    gulp.task('copy-debug', () => {
        gulp.src(files, {base: 'src', cwd: 'src'})
            .pipe(gulp.dest(getDestDir({production: false})));
    });
};
