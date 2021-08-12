// @ts-check
const {bundleLocale} = require('darkreader-translations/bundle');
const fs = require('fs-extra');
const path = require('path');
const {getDestDir} = require('./paths');
const reload = require('./reload');
const {createTask} = require('./task');

const LOCALES_DIR = `${path.dirname(require.resolve('darkreader-translations/package.json'))}/locales`;
const LOCALES_WATCH_GLOB = `${LOCALES_DIR}/**/*.config`;

/**
 * @param {string} locale
 * @param {boolean} debug
 * @returns {string[]}
 */
const getOutputPaths = (locale, debug) => {
    const chromeDir = getDestDir({debug});
    const firefoxDir = getDestDir({debug, firefox: true});
    const thunderBirdDir = getDestDir({debug, thunderbird: true});
    return [chromeDir, firefoxDir, thunderBirdDir].map((dir) => {
        return `${dir}/_locales/${locale}/messages.json`;
    });
};

async function bundleLocalesTask({debug}) {
    const list = await fs.readdir(LOCALES_DIR);
    for (const name of list) {
        if (!name.endsWith('.config')) {
            continue;
        }
        await bundleLocale(`${LOCALES_DIR}/${name}`, (loc) => getOutputPaths(loc, debug));
    }
}

module.exports = createTask(
    'bundle-locales',
    bundleLocalesTask,
).addWatcher(
    [LOCALES_WATCH_GLOB],
    async (changedFiles) => {
        for (const file of changedFiles) {
            await bundleLocale(file, (loc) => getOutputPaths(loc, true));
        }
        reload({type: reload.FULL});
    },
);
