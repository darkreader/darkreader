async function runTasks(tasks, options) {
    for (let task of tasks) {
        const name = task.name;
        try {
            const start = Date.now();
            await task(options);
            const end = Date.now();
            log(`${name} (${(end - start).toFixed(0)}ms)`);
        } catch (err) {
            log.error(`${name} error\n${err.stack || err}`);
            throw err;
        }
    }
}

const colors = Object.entries({
    gray: '\x1b[90m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
}).reduce((map, [key, value]) => Object.assign(map, {[key]: (text) => `${value}${text}\x1b[0m`}), {});

function logWithTime(text) {
    const time = (new Date()).toISOString().substring(11, 19);
    return console.log(`${colors.gray(`${time}`)} ${text}`);
}

const log = Object.assign((text) => logWithTime(text), {
    ok: (text) => logWithTime(colors.green(text)),
    warn: (text) => logWithTime(colors.yellow(text)),
    error: (text) => logWithTime(colors.red(text)),
});

module.exports = {
    runTasks,
    log,
};
