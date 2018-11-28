const fs = require('fs-extra');
const {getDestDir} = require('./paths');

async function bundleLocales({production}) {
    const destDir = getDestDir({production});
    const localesSrcDir = 'src/_locales'
    const list = await fs.readdir(localesSrcDir);
    for (let name of list) {
        if (!name.endsWith('.config')) {
            continue;
        }
        let file = await fs.readFile(`${localesSrcDir}/${name}`, 'utf8');
        file = file.replace(/^#.*?$/gm, '');

        const messages = {};

        const regex = /@([a-z0-9_]+)/ig;
        let match;
        while (match = regex.exec(file)) {
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

        const locale = name.substring(0, name.length - 7);
        await fs.outputFile(`${destDir}/_locales/${locale}/messages.json`, `${JSON.stringify(messages, null, 4)}\n`);
    }
}

module.exports = bundleLocales;
