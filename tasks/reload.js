const http = require('http');
const {logInfo, logWarn} = require('./utils');

module.exports = function createReloadTask(gulp) {
    let shouldReload = false;
    let connectionTimeoutId = null;

    const server = http.createServer((req, res) => {
        if (shouldReload) {
            shouldReload = false;
            res.end('reload');
            logInfo('Auto-reloader connected');
            clearTimeout(connectionTimeoutId);
        } else {
            res.end('waiting');
        }
    });
    server.listen(8890, () => logInfo('Auto-reloader started'));

    function waitForConnection() {
        shouldReload = true;
        connectionTimeoutId = setTimeout(() => {
            logWarn('Auto-reloader did not connect');
            shouldReload = false;
        }, 5000);
    }

    function closeServer() {
        server.close(() => logInfo('Auto-reloader exit'));
    }

    process.on('exit', closeServer);
    process.on('SIGINT', closeServer);

    gulp.task('reload', (done) => {
        waitForConnection();
        done();
    });
};
