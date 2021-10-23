// @ts-check
const {exec} = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function winProgramFiles(relPath) {
    const x64Path = path.join(process.env.PROGRAMFILES, relPath);
    if (await fs.exists(x64Path)) {
        return x64Path;
    }
    return path.join(process.env['ProgramFiles(x86)'], relPath);
}

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
        return await winProgramFiles('Google\\Chrome\\Application\\chrome.exe');
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
    return await linuxAppPath('firefox-nightly');
}

const chromeExtensionDebugDir = path.join(__dirname, '../../build/debug/chrome');
const firefoxExtensionDebugDir = path.join(__dirname, '../../build/debug/firefox');

module.exports = {
    getChromePath,
    getFirefoxPath,
    chromeExtensionDebugDir,
    firefoxExtensionDebugDir,
};
