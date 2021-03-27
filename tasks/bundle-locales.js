const fs = require('fs-extra');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');

async function bundleLocale(/** @type {string} */filePath, {debug}) {
    let file = await fs.readFile(filePath, 'utf8');
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
    const chromeDir = getDestDir({debug});
    const firefoxDir = getDestDir({debug, firefox: true});
    const thunderBirdDir = getDestDir({debug, thunderbird: true});
    await fs.outputFile(getOutputPath(chromeDir), json);
    await fs.outputFile(getOutputPath(firefoxDir), json);
    await fs.outputFile(getOutputPath(thunderBirdDir), json);
}

async function bundleLocales({debug}) {
    const localesSrcDir = 'src/_locales';
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
