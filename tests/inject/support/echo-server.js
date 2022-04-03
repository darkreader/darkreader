/** @typedef {import('connect').NextHandleFunction} NextHandleFunction */
/** @typedef {import('log4js').Logger} Logger */

const pluginName = 'middleware:echo-server';

/**
 * @param {string} [urlRoot]
 * @param {KarmaLogger} logger
 * @returns {NextHandleFunction}
 */
function createEchoServer(urlRoot, logger) {
    /** @type {Logger} */
    const log = logger.create(pluginName);
    log.addContext('urlRoot', urlRoot);
    log.info('Echo server ready');

    return function (req, res, next) {
        if (!req.url.startsWith(`${urlRoot}echo?`)) {
            next();
            return;
        }

        /** @type {Logger} */
        const requestLog = logger.create(pluginName);
        requestLog.addContext('request', req);
        requestLog.debug('Handling request');

        const {searchParams} = new URL(req.url, `http://${req.headers.host}`);

        let contentType = searchParams.get('type') || 'text/plain',
            content = searchParams.get('content'),
            statusCode = 200;

        if (content === null) {
            contentType = 'text/plain';
            content = 'Send content like /echo?type=text%2Fplain&content=XYZ';
            statusCode = 500;
        }

        res.writeHead(statusCode, {'Content-Type': contentType});
        res.end(content, 'utf-8');
    };
}

createEchoServer.$inject = ['config.urlRoot', 'logger'];

module.exports = {
    [pluginName]: ['factory', createEchoServer],
};
