const http = require('http');
const {logInfo, logWarn} = require('./utils');

module.exports = function createReloadTask(gulp) {
    let shouldReload = false;
    let connectionTimeoutId = null;
    let server = null;

    function createServer() {
        server = server || http.createServer((req, res) => {
            if (shouldReload) {
                res.end('reload');
                logInfo('Auto-reloader connected');
                clearTimeout(connectionTimeoutId);
                setTimeout(() => shouldReload = false, 1000);
            } else {
                res.end('waiting');
            }
        }).listen(8890, () => logInfo('Auto-reloader started'));
    }

    function waitForConnection() {
        shouldReload = true;
        connectionTimeoutId = setTimeout(() => {
            logWarn('Auto-reloader did not connect');
            shouldReload = false;
        }, 5000);
    }

    function closeServer() {
        server && server.close(() => logInfo('Auto-reloader exit'));
        server = null;
    }

    process.on('exit', closeServer);
    process.on('SIGINT', closeServer);

    gulp.task('reload', (done) => {
        createServer();
        waitForConnection();
        done();
    });
};
