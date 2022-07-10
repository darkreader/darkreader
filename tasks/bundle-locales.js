// @ts-check
const fs = require('fs').promises;
const {getDestDir, PLATFORM, rootPath} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');
const {readFile, writeFile} = require('./utils');

async function bundleLocale(/** @type {string} */filePath) {
    let file = await readFile(filePath);
    file = file.replace(/^#.*?$/gm, '');

    const messages = {};

    const regex = /@([a-z0-9_]+)/ig;
    let match;
    while ((match = regex.exec(file))) {
        const messageName = match[1];
        const messageStart = match.index + match[0].length;
        let messageEnd = file.indexOf('@', messageStart);
        if (messageEnd < 0) {
            messageEnd = file.length;
        }
        messages[messageName] = {
            message: file.substring(messageStart, messageEnd).trim()
        };
    }

    return `${JSON.stringify(messages, null, 4)}\n`;
}

async function bundleLocales({platforms, debug}) {
    const localesSrcDir = rootPath('src/_locales');
    const list = await fs.readdir(localesSrcDir);
    for (const name of list) {
        if (!name.endsWith('.config')) {
            continue;
        }
        const locale = await bundleLocale(`${localesSrcDir}/${name}`);
        await writeFiles(locale, name, {platforms, debug});
    }
}

async function writeFiles(data, filePath, {platforms, debug}){
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const locale = fileName.substring(0, fileName.lastIndexOf('.')).replace('-', '_');
    const getOutputPath = (dir) => `${dir}/_locales/${locale}/messages.json`;
    for (const platform of Object.values(PLATFORM).filter((platform) => platforms[platform])) {
        const dir = getDestDir({debug, platform});
        await writeFile(getOutputPath(dir), data);
    }
}

module.exports = createTask(
    'bundle-locales',
    bundleLocales,
).addWatcher(
    ['src/_locales/**/*.config'],
    async (changedFiles, _, platforms) => {
        for (const file of changedFiles) {
            const locale = await bundleLocale(file);
            await writeFiles(locale, file, {platforms, debug: true});
        }
        reload({type: reload.FULL});
    },
);
