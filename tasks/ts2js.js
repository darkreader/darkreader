// @ts-check
const {exec} = require('child_process');
// const fs = require('fs');
const globby = require('globby');
const {readFile, writeFile} = require('./utils');

/**
 * @param {string} command
 * @returns {Promise<string>}
 */
function run(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.trim());
            }
        });
    });
}

function getParenthesesRange(/** @type {string} */input, {open = '(', close = ')', srart = 0} = {}) {
    const length = input.length;
    let depth = 0;
    let firstOpenIndex = -1;
    for (let i = srart; i < length; i++) {
        if (depth === 0) {
            const openIndex = input.indexOf(open, i);
            if (openIndex < 0) {
                break;
            }
            firstOpenIndex = openIndex;
            depth++;
            i = openIndex;
        } else {
            const closingIndex = input.indexOf(close, i);
            if (closingIndex < 0) {
                break;
            }
            const openIndex = input.indexOf(open, i);
            if (openIndex < 0 || closingIndex < openIndex) {
                depth--;
                if (depth === 0) {
                    return {start: firstOpenIndex, end: closingIndex + 1};
                }
                i = closingIndex;
            } else {
                depth++;
                i = openIndex;
            }
        }
    }
    return null;
}

/**
 * @param {string} aPath
 * @param {string} bPath
 * @returns {number}
 */
function compareByPath(aPath, bPath) {
    const [a, b] = [aPath, bPath].map((path) => {
        const slash = path.lastIndexOf('/');
        return {dir: path.substring(0, slash), file: path.substring(slash + 1)};
    });
    return a.dir.localeCompare(b.dir) || a.file.localeCompare(b.file);
}

async function getFiles() {
    return (await globby(['src/**/*.ts', 'src/**/*.tsx']))
        .sort(compareByPath)
        .filter((file) => !file.endsWith('.d.ts'));
}

const simpleTypes = [
    'string',
    'number',
    'boolean',
];

/**
 * @param {string} content
 * @returns {string}
 */
function convert(content) {
    const lines = content.split('\n');
    /** @type {string[]} */
    const results = [];

    // Find imports and type imports
    /** @type {Array<{name: string; alias: string; path: string}>} */
    const importedTypes = [];
    let lastImportIndex = -1;
    lines.forEach((ln, i) => {
        const isImport = ln.startsWith('import ');
        const isTypeImport = ln.startsWith('import type ');
        if (isTypeImport) {
            const path = ln.substring(ln.indexOf(`'`) + 1, ln.lastIndexOf(`'`));
            ln
                .substring(ln.indexOf('{') + 1, ln.indexOf('}'))
                .split(',')
                .map((part) => part.trim())
                .map((part) => {
                    const splitIndex = part.indexOf(' as ');
                    if (splitIndex < 0) {
                        importedTypes.push({name: part, alias: part, path})
                    } else {
                        const name = part.substring(0, splitIndex);
                        const alias = part.substring(splitIndex + 5).trim();
                        importedTypes.push({name, alias, path});
                    }
                });
        } else if (isImport) {
            lastImportIndex = i;
        }
    });
    importedTypes.sort((a, b) => {
        return compareByPath(a.path, b.path) || a.name.localeCompare(b.name);
    });

    results.push('// @ts-check');
    lines.forEach((ln, i) => {
        const isImport = ln.startsWith('import ');
        const isTypeImport = ln.startsWith('import type ');
        if (isTypeImport) {
            return;
        }
        if (isImport) {
            results.push(ln);
            if (i === lastImportIndex) {
                results.push('');
                importedTypes.forEach(({name, alias, path}) => {
                    results.push(`/** @typedef {import('${path}')${name ? `.${name}` : '.default'}}${alias ? ` ${alias}` : ''} */`);
                });
            }
            return;
        }

        const constTypeMatch = ln.match(/(^(( *).*[A-Za-z0-9_]+ )?(const|let) .*?)\: ([A-Za-z0-9_]+)( \=.*?)$/);
        if (constTypeMatch) {
            const m = constTypeMatch;
            results.push(`${m[3]}/** @type {${m[5]}} */`);
            results.push(`${m[1]}${m[6]}`);
            return;
        }

        const undefinedLetTypeMatch = ln.match(/(^( *)(.*[A-Za-z0-9_]+ )?(const|let) .*?)\: ([A-Za-z0-9_]+);$/);
        if (undefinedLetTypeMatch) {
            const m = undefinedLetTypeMatch;
            results.push(`${m[2]}/** @type {${m[5]}} */`);
            results.push(`${m[1]};`);
            return;
        }

        const constSetTypeMatch = ln.match(/^(( *)(.*? )?(const|let) [A-Za-z0-9_]+ \= new Set)<(.*?)>(\(\);)$/);
        if (constSetTypeMatch) {
            const m = constSetTypeMatch;
            results.push(`${m[2]}/** @type {Set<${m[5]}>} */`);
            results.push(`${m[1]}${m[6]}`);
            return;
        }

        results.push(ln);
    });

    return results.join('\n');
}

async function start() {
    const files = await getFiles();
    for (const src of files) {
        const dest = src.replace(/\.(ts|tsx)$/, '.js');
        console.log(dest);
        const content = await readFile(src);
        const converted = convert(content);
        await run(`git mv ${src} ${dest}`);
        await writeFile(dest, converted);
        return;
    }
}

start();
