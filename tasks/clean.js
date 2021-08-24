const fs = require('fs-extra');
const {getDestDir} = require('./paths');
const {createTask} = require('./task');

async function clean({debug}) {
    await fs.remove(getDestDir({debug}));
    await fs.remove(getDestDir({debug, firefox: true}));
    await fs.remove(getDestDir({debug, thunderbird: true}));
}

module.exports = createTask(
    'clean',
    clean,
);
