// @ts-check
import {exec} from 'node:child_process';
import {accessSync} from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

/** @type {{[color: string]: (text: string) => string}} */
const colors = Object.entries({
    gray: '\x1b[90m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
}).reduce((map, [key, value]) => Object.assign(map, {[key]: (/** @type {string} */text) => `${value}${text}\x1b[0m`}), {});

/**
 * @param {string} command
 * @returns {Promise<string>}
 */
export async function execute(command) {
    return new Promise((resolve, reject) => exec(command, (error, stdout) => {
        if (error) {
            reject(`Failed to execute command ${command}`);
        } else {
            resolve(stdout);
        }
    }));
}

/**
 * @param {string} text
 * @returns
 */
export function logWithTime(text) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const leftpad = (/** @type {number} */n) => String(n).padStart(2, '0');
    return console.log(`${colors.gray([hours, minutes, seconds].map(leftpad).join(':'))} ${text}`);
}

export const log = Object.assign((/** @type {string} */text) => logWithTime(text), {
    ok: (/** @type {string} */text) => logWithTime(colors.green(text)),
    warn: (/** @type {string} */text) => logWithTime(colors.yellow(text)),
    error: (/** @type {string} */text) => logWithTime(colors.red(text)),
});

/**
 * @param {string} dest
 * @returns {Promise<boolean>}
 */
export async function pathExists(dest) {
    try {
        await fs.access(dest);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * @param {string} dest
 * @returns {boolean}
 */
export function pathExistsSync(dest) {
    try {
        accessSync(dest);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * @param {string} dir
 * @returns {Promise<void>}
 */
export async function removeFolder(dir) {
    if (await pathExists(dir)) {
        await fs.rm(dir, {recursive: true});
    }
}

/**
 * @param {string} dest
 * @returns {Promise<void>}
 */
export async function mkDirIfMissing(dest) {
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
export async function copyFile(src, dest) {
    await mkDirIfMissing(dest);
    await fs.copyFile(src, dest);
}

/**
 * @param {string} src
 * @param {BufferEncoding} [encoding]
 * @returns {Promise<string>}
 */
export async function readFile(src, encoding = 'utf8') {
    return await fs.readFile(src, encoding);
}

/**
 * @param {string} src
 * @returns {Promise<boolean>}
 */
export async function fileExists(src) {
    try {
        await fs.access(src, fs.constants.R_OK);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * @param {string} dest
 * @param {string} content
 * @param {BufferEncoding | null | undefined} encoding
 * @returns {Promise<void>}
 */
export async function writeFile(dest, content, encoding = 'utf8') {
    await mkDirIfMissing(dest);
    await fs.writeFile(dest, content, encoding);
}

/**
 * @param {string} path
 * @returns {Promise<Object>}
 */
export async function readJSON(path) {
    const file = await readFile(path);
    return JSON.parse(file);
}

/**
 * @param {string} dest
 * @param {string} content
 * @param {string | number | undefined} space
 * @returns {Promise<void>}
 */
export async function writeJSON(dest, content, space = 4) {
    const string = JSON.stringify(content, null, space);
    return await writeFile(dest, string);
}

/**
 * @param {string | string[]} patterns
 * @returns {Promise<string[]>}
 */
export async function getPaths(patterns) {
    const {globby} = await import('globby');
    return await globby(patterns);
}

/**
 * @param {number} delay
 * @returns {Promise<void>}
 */
export function timeout(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * @param {string} url
 * @returns {Promise<{buffer(): Buffer; text(encoding?: BufferEncoding): string; type(): string}>}
 */
export function httpsRequest(url) {
    return new Promise((resolve) => {
        /** @type {Uint8Array[]} */
        const data = [];
        https.get(url, (response) => {
            response
                .on('data', (chunk) => data.push(chunk))
                .on('end', () => {
                    const buffer = Buffer.concat(data);
                    resolve({
                        buffer: () => buffer,
                        text: (encoding = 'utf8') => buffer.toString(encoding),
                        type: () => response.headers['content-type'] || '',
                    });
                });
        });
    });
}
