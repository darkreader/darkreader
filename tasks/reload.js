const http = require('http');
const {logError, logInfo, logWarn} = require('./utils');

module.exports = function createReloadTask(gulp) {
    gulp.task('reload', (done) => {
        const server = http.createServer((req, res) => res.end('reload'));
        const sockets = {};
        let connected = false;
        let socketCount = 0;

        const connectionTimeoutId = setTimeout(() => {
            logWarn('Auto-reloader did not connect');
            closeServer();
        }, 5000);

        function closeServer() {
            for (let id in sockets) {
                sockets[id].destroy();
            }
            server.close();
            clearTimeout(connectionTimeoutId);
        }

        server.on('connection', (socket) => {
            sockets[socketCount++] = socket;
            if (!connected) {
                logInfo('Auto-reloader connected');
                socket.emit('reload', {});
                connected = true;
                closeServer();
            }
        });
        server.on('error', (e) => {
            logError(`Server error: ${e}`);
            closeServer();
        });

        server.listen(8890);

        done();
    });
};
