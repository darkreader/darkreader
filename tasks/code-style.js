// @ts-check
const prettier = require('prettier');
const {getDestDir, PLATFORM} = require('./paths');
const {createTask} = require('./task');
const {log, readFile, writeFile, getPaths} = require('./utils');

/** @type {import('prettier').Options} */
const options = {
    arrowParens: 'always',
    bracketSpacing: false,
    endOfLine: 'crlf',
    printWidth: 80,
    quoteProps: 'consistent',
    singleQuote: false,
    tabWidth: 4,
    trailingComma: 'none',
};

const extensions = ['html', 'css', 'js'];

async function codeStyle({platforms, debug}) {
    if (debug) {
        throw new Error('code-style task does not support debug builds');
    }
    const platform = Object.values(PLATFORM).find((platform) => platforms[platform]);
    const dir = getDestDir({debug, platform});
    const files = await getPaths(extensions.map((ext) => `${dir}/**/*.${ext}`));
    for (const file of files) {
        const code = await readFile(file);
        const formatted = prettier.format(code, {
            ...options,
            filepath: file,
        });
        if (code !== formatted) {
            await writeFile(file, formatted);
            debug && log.ok(file);
        }
    }
}

module.exports = createTask(
    'code-style',
    codeStyle,
);
