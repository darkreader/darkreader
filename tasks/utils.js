const fancyLog = require('fancy-log');

const logError = (text) => fancyLog.error(`\x1b[31m${text}\x1b[0m`);
const logInfo = (text) => fancyLog.info(`\x1b[32m${text}\x1b[0m`);
const logWarn = (text) => fancyLog.warn(`\x1b[33m${text}\x1b[0m`);

module.exports = {
    logError,
    logInfo,
    logWarn,
};
