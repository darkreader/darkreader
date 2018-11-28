const http = require('http');
const {log} = require('./utils');

const PORT = 8890;
const WAIT_FOR_CONNECTION = 5000;
const WAIT_FOR_MULTIPLE_CONNECTIONS = 1000;

let shouldReload = false;
let connectionTimeoutId = null;
let server = null;
const sockets = new Set();

function createServer() {
    server = http.createServer((req, res) => {
        if (shouldReload) {
            res.end('reload');
            log.ok('Auto-reloader connected');
            clearTimeout(connectionTimeoutId);
            setTimeout(() => shouldReload = false, WAIT_FOR_MULTIPLE_CONNECTIONS);
        } else {
            res.end('waiting');
        }
    }).listen(PORT, () => log.ok('Auto-reloader started'));
    server.on('connection', (socket) => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });
}

function waitForConnection() {
    shouldReload = true;
    connectionTimeoutId = setTimeout(() => {
        log.warn('Auto-reloader did not connect');
        shouldReload = false;
    }, WAIT_FOR_CONNECTION);
}

function closeServer() {
    server && server.close(() => log.ok('Auto-reloader exit'));
    sockets.forEach((socket) => socket.destroy());
    sockets.clear();
    server = null;
}

process.on('exit', closeServer);
process.on('SIGINT', closeServer);

function reload() {
    if (!server) {
        createServer();
    }
    waitForConnection();
}

module.exports = reload;
