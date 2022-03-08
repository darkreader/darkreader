// @ts-check
const {existsSync} = require('fs');

const lastArg = process.argv.pop();
if (lastArg === __filename) {
    throw new Error('Error: File or directory expected as a single argument');
}

process.exit(existsSync(lastArg) ? 0 : 1);
