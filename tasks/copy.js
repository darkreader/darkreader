const {getDestDir} = require('./paths');

module.exports = function createCopyTasks(gulp) {
    const files = [
        'background/index.html',
        'config/**/*.cfg',
        'config/**/*.json',
        '!config/sites_fixes_v2.json',
        'icons/**/*.*',
        'ui/assets/**/*.*',
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
