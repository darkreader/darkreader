// @ts-check
const {exec} = require('child_process');
const fs = require('fs');
const path = require('path');

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
async function getChromePath() {
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
 * @returns {Promise<string>}
 */
async function getFirefoxPath() {
    if (process.platform === 'darwin') {
        return '/Applications/Firefox Nightly.app/Contents/MacOS/firefox-bin';
    }
    if (process.platform === 'win32') {
        return await winProgramFiles('Firefox Nightly\\firefox.exe');
    }
    const possibleLinuxPaths = ['firefox-nightly', 'firefox'];
    for (const possiblePath of possibleLinuxPaths) {
        try {
            return await linuxAppPath(possiblePath);
        } catch (e) {
            // ignore
        }
    }
    throw new Error('Could not find firefox-nightly');
}

const chromeExtensionDebugDir = path.join(__dirname, '../../build/debug/chrome');
const firefoxExtensionDebugDir = path.join(__dirname, '../../build/debug/firefox');

module.exports = {
    getChromePath,
    getFirefoxPath,
    chromeExtensionDebugDir,
    firefoxExtensionDebugDir,
};
