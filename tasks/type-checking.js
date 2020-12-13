const {exec} = require('child_process');
const {createTask} = require('./task');

async function typeCheck() {
    await new Promise((resolve, reject) => {
        exec(`${process.execPath} ${require.resolve('typescript/lib/tsc.js')} --project "src/tsconfig.json"`, (err) => {
            if (err) {
                reject(new Error(`tsc exited with error: ${err}`));
            } else {
                resolve();
            }
        });
    });
}

module.exports = createTask(
    'type-checking',
    typeCheck,
);
