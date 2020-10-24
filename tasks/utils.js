const colors = Object.entries({
    gray: '\x1b[90m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
}).reduce((map, [key, value]) => Object.assign(map, {[key]: (text) => `${value}${text}\x1b[0m`}), {});

function logWithTime(text) {
    const now = new Date();
    const seconds = now.getSeconds().toString().padStart(2, 0);
    const minutes = now.getMinutes().toString().padStart(2, 0);
    const hours = now.getHours().toString().padStart(2, 0);
    return console.log(`${colors.gray(`${hours}:${minutes}:${seconds}`)} ${text}`);
}

const log = Object.assign((text) => logWithTime(text), {
    ok: (text) => logWithTime(colors.green(text)),
    warn: (text) => logWithTime(colors.yellow(text)),
    error: (text) => logWithTime(colors.red(text)),
});

module.exports = {
    log,
};
