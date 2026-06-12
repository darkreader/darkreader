// @ts-check
import http from 'node:http';
import path from 'node:path';

const mimeTypes = new Map(
    Object.entries({
        '.css': 'text/css',
        '.html': 'text/html',
        '.jpg': 'image/jpeg',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
    }),
);

/**
 * We reuse a single listener for each of exit and SIGINT events to
 * avoid warnings about possible event listener leaks.
 * @type {Array<() => Promise<void>>}
 */
const terminationListeners = [];
const terminationListener = () => {
    terminationListeners.forEach((listener) => listener());
};

export function generateRandomId() {
    return Math.floor(Math.random() * 2 ** 55).toString();
}

/**
 * @param {number} port
 * @param {{cors?: boolean}} [options]
 */
export async function createTestServer(port, options = {}) {
    const {cors = false} = options;
    /** @type {import('http').Server} */
    let server;
    /** @type {{[path: string]: string | import('http').RequestListener}} */
    const paths = {};
    /** @type {Set<import('net').Socket>} */
    const sockets = new Set();

    /** @type {import('http').RequestListener} */
    function handleRequest(req, res) {
        const parsedURL = new URL(req.url, 'https://localhost');
        const pathName = parsedURL.pathname;

        if (!paths.hasOwnProperty(pathName)) {
            res.statusCode = 404;
            res.end('Not found');
            return;
        }

        const contentOrListener = paths[pathName];

        if (typeof contentOrListener === 'function') {
            const listener = contentOrListener;
            return listener(req, res);
        }

        const content = contentOrListener;
        const ext = pathName === '/' ? '.html' : path.extname(pathName);
        const contentType = mimeTypes.get(ext) || 'text/plain';

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        if (cors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.end(content, 'utf8');
    }

    /**
     * @returns {Promise<void>}
     */
    function start() {
        return new Promise((resolve, reject) => {
            let actualPort = port;

            const listen = (listenPort) => {
                server = http.createServer(handleRequest);
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        if (process.env.TEST_SERVER_ALLOW_DYNAMIC_PORT === '1' && listenPort !== 0) {
                            listen(0);
                            return;
                        }
                        reject(new Error(
                            `Test HTTP server port ${listenPort} is already in use. `
                            + `Free it with: lsof -ti:${listenPort} | xargs kill -9 `
                            + '(or set TEST_SERVER_ALLOW_DYNAMIC_PORT=1 to opt into dynamic ports).',
                        ));
                        return;
                    }
                    reject(err);
                });
                server.on('connection', (socket) => {
                    sockets.add(socket);
                    socket.on('close', () => sockets.delete(socket));
                });
                server.listen(listenPort, () => {
                    actualPort = /** @type {import('net').AddressInfo} */ (server.address()).port;
                    resolve(actualPort);
                });
            };

            listen(port);
        });
    }

    /**
     * @param {{[path: string]: string | import('http').RequestListener}} newPaths
     */
    function setPaths(newPaths) {
        Object.assign(paths, newPaths);
    }

    /**
     * @returns {Promise<void>}
     */
    function close() {
        if (!server) {
            return;
        }
        return new Promise((resolve) => {
            server.close((err) => {
                if (err) {
                    console.error(err);
                }
                server = null;
                resolve();
            });
            sockets.forEach((socket) => {
                socket.destroy();
            });
        });
    }

    if (terminationListeners.length === 0) {
        process.on('exit', terminationListener);
        process.on('SIGINT', terminationListener);
    }
    terminationListeners.push(close);

    const actualPort = await start();

    return {
        setPaths,
        close,
        port: actualPort,
        url: `http://localhost:${actualPort}`,
    };
}
