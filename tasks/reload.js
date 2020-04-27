const WebSocket = require('ws');
const {log} = require('./utils');

const PORT = 8890;
const WAIT_FOR_CONNECTION = 2000;

/** @type {import('ws').Server} */
let server = null;

/** @type {Set<WebSocket>} */
const sockets = new Set();
const times = new WeakMap();

/**
 * @returns {Promise<import('ws').Server>}
 */
function createServer() {
    return new Promise((resolve) => {
        const server = new WebSocket.Server({port: PORT});
        server.on('listening', () => {
            log.ok('Auto-reloader started');
            resolve(server);
        });
        server.on('connection', async (ws) => {
            sockets.add(ws);
            times.set(ws, Date.now());
            ws.on('message', async (data) => {
                const message = JSON.parse(data);
                if (message.type === 'reloading') {
                    log.ok('Extension reloading...');
                }
            });
            ws.on('close', () => sockets.delete(ws));
            if (connectionAwaiter != null) {
                connectionAwaiter();
            }
        });
    });
}

function closeServer() {
    server && server.close(() => log.ok('Auto-reloader exit'));
    sockets.forEach((ws) => ws.close());
    sockets.clear();
    server = null;
}

process.on('exit', closeServer);
process.on('SIGINT', closeServer);

/** @type {() => void} */
let connectionAwaiter = null;

function waitForConnection() {
    return new Promise((resolve) => {
        connectionAwaiter = () => {
            connectionAwaiter = null;
            clearTimeout(timeoutId);
            setTimeout(resolve, WAIT_FOR_CONNECTION);
        };
        const timeoutId = setTimeout(() => {
            log.warn('Auto-reloader did not connect');
            connectionAwaiter = null;
            resolve();
        }, WAIT_FOR_CONNECTION);
    });
}

/**
 * @param {WebSocket} ws
 * @param {any} message
 */
function send(ws, message) {
    ws.send(JSON.stringify(message));
}

/**
 * @param {Object} options
 * @param {string} options.type
 */
async function reload({type}) {
    if (!server) {
        server = await createServer();
    }
    if (sockets.size === 0) {
        await waitForConnection();
    }
    const now = Date.now();
    Array.from(sockets.values())
        .filter((ws) => {
            const created = times.get(ws);
            return created < now;
        })
        .forEach((ws) => send(ws, {type}));
}

module.exports = reload;
module.exports.PORT = PORT;
module.exports.CSS = 'reload:css';
module.exports.FULL = 'reload:full';
module.exports.UI = 'reload:ui';
