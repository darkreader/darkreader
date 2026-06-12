// @ts-check
import {exec} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * @param {string} relPath
 * @returns {string}
 */
function winProgramFiles(relPath) {
    const x64Path = path.join(process.env.PROGRAMFILES, relPath);
    if (fs.existsSync(x64Path)) {
        return x64Path;
    }
    return path.join(process.env['ProgramFiles(x86)'], relPath);
}

/**
 * @param {string} app
 * @returns {Promise<string>}
 */
function linuxAppPath(app) {
    return new Promise((resolve, reject) => {
        exec(`which ${app}`, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.trim());
            }
        });
    });
}

/**
 * @returns {Promise<string>}
 */
export async function getChromePath() {
    if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
        return process.env.CHROME_BIN;
    }
    if (process.platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    if (process.platform === 'win32') {
        return winProgramFiles('Google\\Chrome\\Application\\chrome.exe');
    }
    const possibleLinuxPaths = ['google-chrome', 'google-chrome-stable', 'chromium'];
    for (const possiblePath of possibleLinuxPaths) {
        try {
            return await linuxAppPath(possiblePath);
        } catch (e) {
            // ignore
        }
    }
    throw new Error('Could not find Chrome');
}

/**
 * @param {string[]} paths
 * @returns {string | null}
 */
function firstExistingPath(paths) {
    for (const candidate of paths) {
        if (candidate && fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

/**
 * @returns {Promise<string>}
 */
export async function getFirefoxPath() {
    if (process.env.FIREFOX_BIN && fs.existsSync(process.env.FIREFOX_BIN)) {
        return process.env.FIREFOX_BIN;
    }
    if (process.platform === 'darwin') {
        const found = firstExistingPath([
            '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
            '/Applications/Firefox.app/Contents/MacOS/firefox',
            '/Applications/Firefox Nightly.app/Contents/MacOS/firefox',
        ]);
        if (found) {
            return found;
        }
        throw new Error('Could not find Firefox');
    }
    if (process.platform === 'win32') {
        return await winProgramFiles('Firefox Nightly\\firefox.exe');
    }
    const possibleLinuxPaths = ['firefox-nightly', 'firefox'];
    for (const possiblePath of possibleLinuxPaths) {
        try {
            // snap profile folders do not get loaded
            const option = await linuxAppPath(possiblePath);
            // Firefox snap can not access the regular system-wide temporary directory,
            // so we create a separate one within build folder
            // See also: https://github.com/mozilla/web-ext/issues/1696
            if (!option.includes('/snap/')) {
                return option;
            }
            const firefoxProfile = './build/firefox-profile-for-testing';
            process.env.TMPDIR = firefoxProfile;
            try {
                fs.mkdirSync(firefoxProfile);
            } catch (e) {
                // Do nothing
            }
            return option;
        } catch (e) {
            // ignore
        }
    }
    throw new Error('Could not find firefox-nightly');
}

export const chromeMV3ExtensionDebugDir = path.join(__dirname, '../../build/debug/chrome-mv3');
export const firefoxExtensionDebugDir = path.join(__dirname, '../../build/debug/firefox');
