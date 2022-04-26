// @ts-check
const fs = require('fs').promises;
const {getDestDir, PLATFORM, rootPath} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');
const {readFile, writeFile} = require('./utils');

async function bundleLocale(/** @type {string} */filePath, {debug}) {
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

    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const locale = fileName.substring(0, fileName.lastIndexOf('.')).replace('-', '_');
    const json = `${JSON.stringify(messages, null, 4)}\n`;
    const getOutputPath = (dir) => `${dir}/_locales/${locale}/messages.json`;
    for (const platform of Object.values(PLATFORM)) {
        const dir = getDestDir({debug, platform});
        await writeFile(getOutputPath(dir), json);
    }
}

async function bundleLocales({debug}) {
    const localesSrcDir = rootPath('src/_locales');
    const list = await fs.readdir(localesSrcDir);
    for (const name of list) {
        if (!name.endsWith('.config')) {
            continue;
        }
        await bundleLocale(`${localesSrcDir}/${name}`, {debug});
    }
}

module.exports = createTask(
    'bundle-locales',
    bundleLocales,
).addWatcher(
    ['src/_locales/**/*.config'],
    async (changedFiles) => {
        for (const file of changedFiles) {
            await bundleLocale(file, {debug: true});
        }
        reload({type: reload.FULL});
    },
);
