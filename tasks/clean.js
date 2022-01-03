const fs = require('fs-extra');
const {getDestDir, PLATFORM} = require('./paths');
const {createTask} = require('./task');

async function clean({debug}) {
    await fs.remove(getDestDir({debug, platform: PLATFORM.CHROME}));
    await fs.remove(getDestDir({debug, platform: PLATFORM.FIREFOX}));
    await fs.remove(getDestDir({debug, platform: PLATFORM.CHROME_MV3}));
    await fs.remove(getDestDir({debug, platform: PLATFORM.THUNDERBIRD}));
}

module.exports = createTask(
    'clean',
    clean,
);
