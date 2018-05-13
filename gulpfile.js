const gulp = require('gulp');
const runSequence = require('run-sequence');

require('./tasks/bundle-css')(gulp);
require('./tasks/bundle-html')(gulp);
require('./tasks/bundle-js')(gulp);
require('./tasks/bundle-locales')(gulp);
require('./tasks/clean')(gulp);
require('./tasks/copy')(gulp);
require('./tasks/foxify')(gulp);
require('./tasks/reload')(gulp);
require('./tasks/watch')(gulp);
require('./tasks/zip')(gulp);

gulp.task('release', (done) => {
    runSequence(
        'clean',
        ['js-release', 'css-release', 'html-release', 'copy-release', 'locales-release'],
        'foxify',
        ['zip', 'zip-firefox'],
        done
    );
});

gulp.task('debug', (done) => {
    runSequence('watch', 'foxify-debug', 'reload', done);
});
