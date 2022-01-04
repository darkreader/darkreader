// @ts-check
const {getDestDir, PLATFORM} = require('./paths');
const {createTask} = require('./task');
const {removeFolder} = require('./utils');

async function clean({debug}) {
    for (const platform of Object.values(PLATFORM)) {
        await removeFolder(getDestDir({debug, platform}));
    }
}

module.exports = createTask(
    'clean',
    clean,
);
