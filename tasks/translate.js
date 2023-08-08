// @ts-check
import fs from 'node:fs/promises';
import {readFile, writeFile, httpsRequest, timeout, log} from './utils.js';

// To use this tool:
// 1. Edit a line in en.config.
// 2. Run `npm run translate-line 123` where 123 is a line number starting from 1.
// 3. The line will be translated and written into other locales.
// TODO: If necessary, new @id and empty lines should be copied as well.
// TODO: Serbian translates into Cyrillic, but it is somehow possible to do Latin.

/** @typedef {{locale: string; file: string; messages: Map<string, string>}} LocaleFile */

const dir = 'src/_locales';

/**
 * Translates `en` locale message for all locales
 * @param {string} messageId Message ID
 */
async function translateEnMessage(messageId) {
    log(`Translating message ${messageId}`);

    const locales = await getAllLocales();
    const enLocale = locales.find((l) => l.locale === 'en');
    const otherLocales = locales.filter((l) => l.locale !== 'en');

    if (!enLocale) {
        throw new Error('Could not find English (en) locale.');
    }
    const message = enLocale.messages.get(messageId);
    if (!message) {
        throw new Error(`Could not find message ${message}.`);
    }

    for (const loc of otherLocales) {
        await timeout(1000);

        /** @type {Map<string, string>} */
        const result = new Map();
        const translated = await translate(message, loc.locale);
        log(`${loc.locale}: ${translated}`);
        for (const id of enLocale.messages.keys()) {
            if (id === messageId) {
                result.set(id, translated);
            } else {
                result.set(id, loc.messages.get(id) ?? '');
            }
        }

        const content = stringifyLocale(result);
        await writeFile(`${dir}/${loc.file}`, content);
        log(`${loc.locale}: ${translated}`);
    }

    log.ok('Translation done');
}

/**
 * Translates new `en` locale lines for all locales
 */
async function translateNewEnMessages() {
    log('Translating new lines');

    const locales = await getAllLocales();
    const enLocale = locales.find((l) => l.locale === 'en');
    const otherLocales = locales.filter((l) => l.locale !== 'en');

    if (!enLocale) {
        throw new Error('Could not find English (en) locale.');
    }

    for (const loc of otherLocales) {
        /** @type {Map<string, string>} */
        const result = new Map();
        for (const id of enLocale.messages.keys()) {
            if (loc.messages.has(id)) {
                result.set(id, loc.messages.get(id) ?? '');
            } else {
                await timeout(1000);
                const message = enLocale.messages.get(id) ?? '';
                const translated = await translate(message, loc.locale);
                result.set(id, translated);
                log(`${loc.locale}: ${translated}`);
            }
        }

        const content = stringifyLocale(result);
        await writeFile(`${dir}/${loc.file}`, content);
    }

    log.ok('Translation done');
}

/**
 * @param {string} content
 * @returns {Map<string, string>}
 */
function parseLocale(content) {
    /** @type {Map<string, string>} */
    const messages = new Map();
    const lines = content.split('\n');
    let id = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('@')) {
            id = line.substring(1);
        } else if (line.startsWith('#')) {
            // Ignore
        } else if (messages.has(id)) {
            const message = messages.get(id);
            messages.set(id, `${message}\n${line}`);
        } else {
            messages.set(id, line);
        }
    }
    messages.forEach((value, id) => {
        messages.set(id, value.trim());
    });
    return messages;
}

/**
 * @param {Map<string, string>} messages
 * @returns {string}
 */
function stringifyLocale(messages) {
    /** @type {string[]} */
    const lines = [];
    messages.forEach((message, id) => {
        lines.push(`@${id}`);
        const hasDoubleNewLines = /\n\n/.test(message);
        message.split('\n')
            .filter((line) => line.trim())
            .forEach((line, index, filtered) => {
                lines.push(line);
                if (hasDoubleNewLines && index < filtered.length - 1) {
                    lines.push('');
                }
            });
        lines.push('');
    });
    return lines.join('\n');
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
        const messages = parseLocale(content);
        locales.push({locale, file, messages});
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
    return translation.sentences.map((s) => s.trans).join('\n');
}

const args = process.argv.slice(2);
if (args[0] === '--message') {
    const messageId = args[1];
    translateEnMessage(messageId);
}
if (args.includes('--new-messages')) {
    translateNewEnMessages();
}
