// @ts-check
const {exec} = require('child_process');
const path = require('path');

/**
 * @returns {Promise<string>}
 */
async function getChromePath() {
    if (process.platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
    if (process.platform === 'win32') {
        return `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`;
    }
    return await new Promise((resolve, reject) => {
        exec('which google-chrome', (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.trim());
            }
        });
    });
}

const chromeExtensionDebugDir = path.join(__dirname, '../../debug');

module.exports = {
    getChromePath,
    chromeExtensionDebugDir,
};
