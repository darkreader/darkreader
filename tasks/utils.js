const colors = Object.entries({
    gray: '\x1B[90m',
    green: '\x1B[32m',
    red: '\x1B[31m',
    yellow: '\x1B[33m',
}).reduce((map, [key, value]) => Object.assign(map, {[key]: (text) => `${value}${text}\x1B[0m`}), {});

const leftpad = (n) => String(n).padStart(2, '0');

function logWithTime(text) {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return console.log(`${colors.gray([hours, minutes, seconds].map(leftpad).join(':'))} ${text}`);
}

const log = Object.assign((text) => logWithTime(text), {
    ok: (text) => logWithTime(colors.green(text)),
    warn: (text) => logWithTime(colors.yellow(text)),
    error: (text) => logWithTime(colors.red(text)),
});

module.exports = {
    log,
};
