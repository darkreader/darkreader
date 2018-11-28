const fs = require('fs-extra');
const {getDestDir} = require('./paths');

async function clean({production}) {
    await fs.remove(getDestDir({production}));
    await fs.remove(getDestDir({production, firefox: true}));
}

module.exports = clean;
