// @ts-check
const fs = require('fs').promises;
const {readFile, writeFile, httpsRequest, timeout, log} = require('./utils');

// To use this tool:
// 1. Edit a line in en.config.
// 2. Run `npm run translate-line 123` where 123 is a line number starting from 1.
// 3. The line will be translated and written into other locales.
// TODO: If neccessary, new @id and empty lines should be copied as well.
// TODO: Serbian translates into Cyrillic, but it is somehow possible to do Latin.

/** @typedef {{locale: string; file: string; content: string}} LocaleFile */

const dir = 'src/_locales';

/**
 * Translates `en` locale line for all locales
 * @param {number} lineNumber Line number starting from 1
 */
async function translateEnLine(lineNumber) {
    log(`Translating line ${lineNumber}`);

    const locales = await getAllLocales();
    const enLocale = locales.find((l) => l.locale === 'en');
    const otherLocales = locales.filter((l) => l.locale !== 'en');

    const enLines = enLocale.content.split('\n');
    const index = lineNumber - 1;
    const line = enLines[index];

    for (const l of otherLocales) {
        await timeout(1000);
        const translated = await translate(line, l.locale);
        const lines = l.content.split('\n');
        lines.splice(
            index,
            // Replace the line if already exists
            lines.length === enLines.length ? 1 : 0,
            translated,
        );
        await writeFile(`${dir}/${l.file}`, lines.join('\n'));
        log(`${l.locale}: ${translated}`);
    }

    log.ok('Translation done');
}

/**
 * @returns {Promise<LocaleFile[]>}
 */
async function getAllLocales() {
    const fileList = await fs.readdir(dir);

    /** @type {LocaleFile[]} */
    const locales = [];

    for (const file of fileList) {
        if (!file.endsWith('.config')) {
            continue;
        }
        const locale = file.substring(0, file.lastIndexOf('.config'));
        const content = await readFile(`${dir}/${file}`);
        locales.push({locale, file, content});
    }

    return locales;
}

/**
 * @param {string} text
 * @param {string} lang
 * @return {Promise<string>}
 */
async function translate(text, lang) {
    const url = new URL('https://translate.googleapis.com/translate_a/single');
    url.search = (new URLSearchParams({
        client: 'gtx',
        sl: 'en-US',
        tl: lang,
        dt: 't',
        dj: '1',
        q: text,
    })).toString();
    const response = await httpsRequest(url.toString());
    const translation = JSON.parse(response.text());
    return translation.sentences.map((s) => s.trans).join('');
}

const args = process.argv.slice(2);
if (args[0] === '--line') {
    const lineNumber = Number(args[1]);
    translateEnLine(lineNumber);
}
