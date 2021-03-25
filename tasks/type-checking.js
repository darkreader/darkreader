const {execFile} = require('child_process');
const {createTask} = require('./task');

async function typeCheck() {
    await new Promise((resolve, reject) => {
        execFile(process.execPath, [require.resolve('typescript/lib/tsc.js'), '--project', 'src/tsconfig.json'], (_, std) => {
            if (std) {
                reject(`tsc has exited with error\n${std}`);
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
