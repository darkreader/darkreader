// @ts-check
import http from 'http';

export async function createEchoServer(/** @type {number} */port) {
    /** @type {import('http').Server} */
    let server;

    /** @type {import('http').RequestListener} */
    function handleRequest(req, res) {
        const parsedURL = new URL(req.url, `http://${req.headers.host}`);
        const pathName = parsedURL.pathname;

        if (pathName !== '/echo') {
            res.statusCode = 500;
            res.end('The URL path must be /echo');
            return;
        }

        const {searchParams} = parsedURL;

        const content = searchParams.get('content');
        if (!content) {
            res.statusCode = 500;
            res.end('Send content like /echo?type=text%2Fplain&content=XYZ');
            return;
        }

        const contentType = searchParams.get('type') || 'text/plain';
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
