const fs = require('fs-extra');
const globby = require('globby');
const prettier = require('prettier');
const {getDestDir} = require('./paths');
const {createTask} = require('./task');
const {log} = require('./utils');

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

async function codeStyle({debug}) {
    const dir = getDestDir({debug});
    const files = await globby(extensions.map((ext) => `${dir}/**/*.${ext}`));
    for (const file of files) {
        const code = await fs.readFile(file, 'utf8');
        const formatted = prettier.format(code, {
            ...options,
            filepath: file,
        });
        if (code !== formatted) {
            await fs.outputFile(file, formatted);
            debug && log.ok(file);
        }
    }
}

module.exports = createTask(
    'code-style',
    codeStyle,
);
