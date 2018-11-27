const gulpLess = require('gulp-less');
const gulpRename = require('gulp-rename');
const gulpSourcemaps = require('gulp-sourcemaps');
const mergeStream = require('merge-stream');
const path = require('path');
const {getDestDir} = require('./paths');
const {logError} = require('./utils');

module.exports = function createCSSBundleTasks(gulp) {
    gulp.task('css-release', () => bundleCSS({production: true}));
    gulp.task('css-debug', () => bundleCSS({production: false}));

    function bundleCSS({production}) {
        const dir = getDestDir({production});
        const files = {
            'src/ui/devtools/style.less': `${dir}/ui/devtools/style.css`,
            'src/ui/popup/style.less': `${dir}/ui/popup/style.css`,
            'src/ui/stylesheet-editor/style.less': `${dir}/ui/stylesheet-editor/style.css`,
        };
        const bundles = Object.entries(files).map(([src, dest]) => bundleCSSEntry({src, dest, production}));
        return mergeStream(...bundles);
    }

    function bundleCSSEntry({src, dest, production}) {
        let stream = gulp.src(src)
            .pipe(gulpSourcemaps.init())
            .pipe(gulpLess())
            .on('error', function (err) {
                logError(err);
                this.emit('end');
            });
        if (!production) {
            stream = stream.pipe(gulpSourcemaps.write());
        }
        return stream
            .pipe(gulpRename(path.basename(dest)))
            .pipe(gulp.dest(path.dirname(dest)));
    }
};
