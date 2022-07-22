// @ts-check
import prettier from 'prettier';
import paths from './paths.js';
import {createTask} from './task.js';
import {log, readFile, writeFile, getPaths} from './utils.js';
const {getDestDir, PLATFORM} = paths;

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

const codeStyleTask = createTask(
    'code-style',
    codeStyle,
);

export default codeStyleTask;
