// @ts-check
const fs = require('fs').promises;
const https = require('https');
const path = require('path');

/** @type {{[color: string]: (text: string) => string}} */
const colors = Object.entries({
    gray: '\x1b[90m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
}).reduce((map, [key, value]) => Object.assign(map, {[key]: (/** @type {string} */text) => `${value}${text}\x1b[0m`}), {});

/**
 * @param {string} text
 * @returns
 */
function logWithTime(text) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const leftpad = (/** @type {number} */n) => String(n).padStart(2, '0');
    return console.log(`${colors.gray([hours, minutes, seconds].map(leftpad).join(':'))} ${text}`);
}

const log = Object.assign((/** @type {string} */text) => logWithTime(text), {
    ok: (/** @type {string} */text) => logWithTime(colors.green(text)),
    warn: (/** @type {string} */text) => logWithTime(colors.yellow(text)),
    error: (/** @type {string} */text) => logWithTime(colors.red(text)),
});

/**
 * @param {string} dest
 * @returns {Promise<boolean>}
 */
async function pathExists(dest) {
    try {
        await fs.access(dest);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * @param {string} dir
 * @returns {Promise<void>}
 */
async function removeFolder(dir) {
    if (await pathExists(dir)) {
        await fs.rm(dir, {recursive: true});
    }
}

/**
 * @param {string} dest
 * @returns {Promise<void>}
 */
async function mkDirIfMissing(dest) {
    const dir = path.dirname(dest);
    if (!(await pathExists(dir))) {
        await fs.mkdir(dir, {recursive: true});
    }
}

/**
 * @param {string} src
 * @param {string} dest
 * @returns {Promise<void>}
 */
async function copyFile(src, dest) {
    await mkDirIfMissing(dest);
    await fs.copyFile(src, dest);
}

/**
 * @param {string} src
 * @returns {Promise<string>}
 */
async function readFile(src) {
    return await fs.readFile(src, 'utf8');
}

/**
 * @param {string} dest
 * @param {string} content
 * @returns {Promise<void>}
 */
async function writeFile(dest, content) {
    await mkDirIfMissing(dest);
    await fs.writeFile(dest, content, 'utf8');
}

/**
 * @param {string | string[]} patterns
 * @returns {Promise<string[]>}
 */
async function getPaths(patterns) {
    const {globby} = await import('globby');
    return await globby(patterns);
}

/**
 * @param {number} delay
 * @returns {Promise<void>}
 */
function timeout(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * @param {string} url
 * @returns {Promise<{buffer(): Buffer; text(encoding?: string): string; type(): string}>}
 */
function httpsRequest(url) {
    return new Promise((resolve) => {
        /** @type {any[]} */
        const data = [];
        https.get(url, (response) => {
            response
                .on('data', (chunk) => data.push(chunk))
                .on('end', () => {
                    const buffer = Buffer.concat(data);
                    resolve({
                        buffer: () => buffer,
                        text: (/** @type {BufferEncoding} */encoding = 'utf8') => buffer.toString(encoding),
                        type: () => response.headers['content-type'],
                    });
                });
        });
    });
}

module.exports = {
    log,
    copyFile,
    pathExists,
    readFile,
    removeFolder,
    writeFile,
    getPaths,
    httpsRequest,
    timeout,
};
