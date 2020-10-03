// @ts-check
const http = require('http');
const path = require('path');
const url = require('url');

const PORT = 8891;

/** @type {import('http').Server} */
let server;
/** @type {{[path: string]: string}} */
const paths = {};

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
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
function handleRequest(req, res) {
    const parsedURL = url.parse(req.url);
    const pathName = parsedURL.pathname;

    if (!paths.hasOwnProperty(pathName)) {
        res.statusCode = 404;
        res.end('Not found');
        return;
    }

    const content = paths[pathName];
    const ext = pathName === '/' ? '.html' : path.extname(pathName);
    const contentType = mimeTypes.get(ext) || 'text/plain';

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.end(content, 'utf8');
}

/**
 * @returns {Promise<void>}
 */
function start() {
    return new Promise((resolve) => {
        server = http
            .createServer(handleRequest)
            .listen(PORT, () => resolve());
    });
}

/**
 * @param {{[path: string]: string}} newPaths
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
            } else {
                console.log('Test server closed');
            }
            resolve();
        });
    });
}

process.on('exit', close);
process.on('SIGINT', close);

module.exports = {
    start,
    setPaths,
    close,
};
