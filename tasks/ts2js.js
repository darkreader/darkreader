// @ts-check
const {exec} = require('child_process');
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
    // return (await globby(['src/**/*.ts', 'src/**/*.tsx']))
    return (await globby(['src/ui/devtools/**/*.tsx']))
        .sort(compareByPath)
        .filter((file) => !file.endsWith('.d.ts'));
}

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
    /** @type {Set<string>} */
    const jsxTags = new Set();
    let lastImportIndex = -1;
    lines.forEach((ln, i) => {
        const isImport = ln.startsWith('import ');
        const isTypeImport = ln.startsWith('import type ');
        const jsxTagMatch = ln.match(/^ *<([A-Za-z0-9]+)/);
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
        } else if (jsxTagMatch) {
            jsxTags.add(jsxTagMatch[1]);
        }
    });
    importedTypes.sort((a, b) => {
        return compareByPath(a.path, b.path) || a.name.localeCompare(b.name);
    });

    results.push('// @ts-check');
    let jsxOpened = 0;
    let jsxAttrsListing = false;
    let jsxFirstAttrListed = false;
    lines.forEach((ln, i) => {
        const isImport = ln.startsWith('import ');
        const isTypeImport = ln.startsWith('import type ');
        if (isTypeImport) {
            return;
        }
        if (isImport) {
            results.push(ln);
            if (i === lastImportIndex) {
                const lowerCaseTags = Array.from(jsxTags).filter((t) => t.match(/^[a-z]/));
                if (lowerCaseTags.length > 0) {
                    results.push(`import {tags} from 'malevic/dom';`);
                    results.push(`const {${lowerCaseTags.join(', ')}} = tags;`);
                }

                if (importedTypes.length > 0) {
                    results.push('');
                    importedTypes.forEach(({name, alias, path}) => {
                        results.push(`/** @typedef {import('${path}')${name ? `.${name}` : '.default'}}${alias ? ` ${alias}` : ''} */`);
                    });
                }
            }
            return;
        }

        const constTypeMatch = ln.match(/(^( *)(export )?(const|let) [A-Za-z]+)?: (.+)( = .*?)$/);
        if (constTypeMatch) {
            const m = constTypeMatch;
            results.push(`${m[2]}/** @type {${m[5]}} */`);
            results.push(`${m[1]}${m[6]}`);
            return;
        }

        const undefinedLetTypeMatch = ln.match(/(^( *)let [A-Za-z0-9_]+): (.+);$/);
        if (undefinedLetTypeMatch) {
            const m = undefinedLetTypeMatch;
            results.push(`${m[2]}/** @type {${m[3]}} */`);
            results.push(`${m[1]};`);
            return;
        }

        const constSetTypeMatch = ln.match(/^(( *)(const|let) [A-Za-z0-9_]+ = new Set)<(.*)>(\(\);)$/);
        if (constSetTypeMatch) {
            const m = constSetTypeMatch;
            results.push(`${m[2]}/** @type {Set<${m[4]}>} */`);
            results.push(`${m[1]}${m[5]}`);
            return;
        }

        const classPropTypeMatch = ln.match(/^(( *)((private )?(static )?)[A-Za-z0-9_]+): (.*?);$/);
        if (classPropTypeMatch) {
            const m = classPropTypeMatch;
            results.push(`${m[2]}/** @type {${m[6]}} */`);
            results.push(`${m[1]};`);
            return;
        }

        const inlineTypeMatch = ln.match(/^( *?)type ([A-Za-z]+) = (.*);$/);
        if (inlineTypeMatch) {
            const m = inlineTypeMatch;
            results.push(`${m[1]}/** @typedef {${m[3]}} ${m[2]} */`);
            return;
        }

        const jsxTagMatch = ln.match(/^( *)<([A-Za-z0-9]+)/);
        if (jsxTagMatch) {
            const spaces = jsxTagMatch[1];
            const tagName = jsxTagMatch[2];
            const isLowerCase = tagName.toLowerCase() === tagName;
            const endTagMatch = ln.match(/<\/[A-Za-z0-9]+>$/);
            const hasSelfClosingTag = ln.match(/\/>$/) != null;
            const isOpenTagClosed = !endTagMatch && !hasSelfClosingTag && ln.match(/>$/) != null;
            const openTagEndIndex = endTagMatch ? ln.lastIndexOf('>', endTagMatch.index) : -1;
            const content = openTagEndIndex > 0 ? ln.substring(openTagEndIndex + 1, endTagMatch.index) : '';
            const attrMatches = ln.matchAll(/([A-Za-z\-]+)=((".*?")|({.*?({.*?})?}))/g);
            const attrString = Array.from(attrMatches).map((m) => {
                const attr = m[1];
                const hasDash = attr.includes('-');
                const value = m[2].substring(1, m[2].length - 1);
                const isString = m[2].startsWith('"');
                const propString = hasDash ? `'${attr}'` : attr;
                const valueString = isString ? `'${value}'` : value;
                return `${propString}: ${valueString}`;
            }).join(', ');
            const hasAttrs = attrString !== '';
            const hasProps = hasAttrs || !isLowerCase;

            let res = `${spaces}${tagName}(`;
            if (hasProps) {
                res += `{${attrString}}`;
                if (content) {
                    res += ', ';
                } else if (!hasSelfClosingTag && !endTagMatch && isOpenTagClosed) {
                    res += ',';
                }
            }
            if (content) {
                if (content.startsWith('{')) {
                    res += content.substring(1, content.length - 1);
                } else {
                    res += `'${content}'`;
                }
            }
            if (endTagMatch || hasSelfClosingTag) {
                res += '),';
            }
            results.push(res);
            jsxAttrsListing = false;
            if (!hasProps && !hasSelfClosingTag && !endTagMatch) {
                jsxFirstAttrListed = false;
                jsxAttrsListing = true;
            }
            if (isOpenTagClosed) {
                jsxOpened++;
            }
            return;
        }

        const jsxAttrMatch = ln.match(/^( *)([A-Za-z\-]+)=("|{)(.*)("|})$/);
        if (jsxAttrMatch) {
            const m = jsxAttrMatch;
            const spaces = `${m[1]}`;
            const attr = m[2];
            const isString = m[3] === '"';
            const value = m[4];
            const hasDash = attr.includes('-');
            if (!jsxFirstAttrListed) {
                results.push(`${spaces}{`);
                jsxFirstAttrListed = true;
            }
            results.push(`${spaces}    ${hasDash ? `'${attr}'` : attr}: ${isString ? `'${value}'` : value},`);
            jsxAttrsListing = true;
            return;
        }

        const jsxTagEndMatch = ln.match(/^( *)>$/);
        if (jsxTagEndMatch) {
            const spaces = jsxTagEndMatch[1];
            results.push(`${spaces}    },`);
            jsxAttrsListing = false;
            jsxOpened++;
            return;
        }

        const jsxSelfClosingTagMatch = ln.match(/^( *)\/>$/);
        if (jsxSelfClosingTagMatch) {
            const spaces = jsxSelfClosingTagMatch[1];
            results.push(`${spaces}    },`);
            const isNextLineClosingParen = (i + 1) < lines.length && lines[i + 1].match(/^ *\)/);
            results.push(`${spaces})${isNextLineClosingParen ? '' : ','}`);
            jsxAttrsListing = false;
            return;
        }

        const jsxClosingTagMatch = ln.match(/^( *)<\/([A-Za-z0-9]+)?>$/);
        if (jsxClosingTagMatch) {
            const spaces = jsxClosingTagMatch[1];
            const isNextLineClosingParen = (i + 1) < lines.length && lines[i + 1].match(/^ *\)/);
            results.push(`${spaces})${isNextLineClosingParen ? '' : ','}`);
            jsxAttrsListing = false;
            jsxOpened--;
            return;
        }

        if (jsxOpened) {
            const m = ln.match(/^( *)(.*)$/);
            const spaces = m[1];
            const content = m[2];
            const isString = !content.startsWith('{');
            results.push(`${spaces}${isString ? `'${content}'` : content.substring(1, content.length - 1)},`);
            return;
        }

        /** @type {Array<[RegExp, string]>} */
        const replacers = [
            [/\(([A-Za-z]+): ([A-Za-z]+)\) => /g, '(/** @type {$2} */$1) => '],
            [/([A-Za-z]+) as ([A-Za-z]+)/g, '/** @type {$2} */($1)'],
        ];

        const replaced = replacers.reduce((output, [regexp, replacer]) => {
            return output.replace(regexp, replacer);
        }, ln);

        results.push(replaced);
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
