// @ts-check
const http = require('http');
const url = require('url');
const queryString = require('querystring');

async function createEchoServer(/** @type {number} */port) {
    /** @type {import('http').Server} */
    let server;

    /** @type {import('http').RequestListener} */
    function handleRequest(req, res) {
        const parsedURL = url.parse(req.url);
        const pathName = parsedURL.pathname;

        if (pathName !== '/echo') {
            res.statusCode = 500;
            res.end('The URL path must be /echo');
            return;
        }

        const parsedQuery = queryString.parse(parsedURL.query);
        if (typeof parsedQuery.content !== 'string') {
            res.statusCode = 500;
            res.end('Send content like /echo?type=text%2Fplain&content=XYZ');
            return;
        }

        const contentType = parsedQuery.type || 'text/plain';
        const content = parsedQuery.content;

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
                .listen(port, () => resolve());
        });
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
        });
    }

    process.on('exit', close);
    process.on('SIGINT', close);

    await start();

    return {
        close,
        url: `http://localhost:${port}`,
    };
}

module.exports = {
    createEchoServer,
};
