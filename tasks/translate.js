// @ts-check
import fs from 'node:fs/promises';

import {readFile, writeFile, fileExists, httpsRequest, timeout, log} from './utils.js';

// To use this tool:
// 1. Edit a line in en.config.
// 2. Run `npm run translate-en-message message_id`.
// 3. The line will be translated and written into other locales.
// TODO: If necessary, new @id and empty lines should be copied as well.
// TODO: Serbian translates into Cyrillic, but it is somehow possible to do Latin.

/** @typedef {{locale: string; file: string; messages: Map<string, string>}} LocaleFile */

const LOCALES_ROOT = 'src/_locales';

/**
 * Translates `en` locale message for all locales
 * @param {string} messageId Message ID
 */
async function translateEnMessage(messageId) {
    log(`Translating message ${messageId}`);

    const supportedLocales = await getSupportedLocales();
    const enFiles = await getLocaleFiles('en');

    let found = false;

    for (const enFile of enFiles) {
        const enContent = await readFile(enFile);
        const enMessages = parseLocale(enContent);
        if (enMessages.has(messageId)) {
            found = true;
            const enMessage = /** @type {string} */(enMessages.get(messageId));
            for (const locale of supportedLocales) {
                if (locale === 'en') {
                    continue;
                }

                await timeout(1000);

                const locFile = `${enFile.slice(0, enFile.lastIndexOf('en.config'))}${locale}.config`;
                const locContent = await readFile(locFile);
                const locMessages = parseLocale(locContent);

                const translated = await translate(enMessage, locale);
                locMessages.set(messageId, translated);

                const output = stringifyLocale(locMessages);
                await writeFile(locFile, output);
                log(`${locale}: ${translated}`);
            }
        }
    }

    if (!found) {
        throw new Error(`Could not find message ${messageId}.`);
    }

    log.ok('Translation done');
}

/**
 * Translates new `en` locale lines for all locales
 */
async function translateNewEnMessages() {
    log('Translating new lines');

    const supportedLocales = await getSupportedLocales();
    const enFiles = await getLocaleFiles('en');

    for (const enFile of enFiles) {
        const enContent = await readFile(enFile);
        const enMessages = parseLocale(enContent);

        for (const locale of supportedLocales) {
            if (locale === 'en') {
                continue;
            }

            /** @type {Map<string, string>} */
            let locMessages = new Map();
            const locFile = `${enFile.slice(0, enFile.lastIndexOf('en.config'))}${locale}.config`;
            if (await fileExists(locFile)) {
                const locContent = await readFile(locFile);
                locMessages = parseLocale(locContent);
            }

            for (const messageId of enMessages.keys()) {
                const enMessage = /** @type {string} */(enMessages.get(messageId));
                const translated = await translate(enMessage, locale);
                locMessages.set(messageId, translated);
                log(`${locale}: ${translated}`);
            }

            const output = stringifyLocale(locMessages);
            await writeFile(locFile, output);
        }
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
 * @returns {Promise<string[]>}
 */
async function getSupportedLocales() {
    const fileList = await fs.readdir(LOCALES_ROOT);

    /** @type {string[]} */
    const locales = [];

    for (const file of fileList) {
        if (file.endsWith('.config')) {
            const locale = file.substring(0, file.lastIndexOf('.config'));
            locales.push(locale);
        }
    }

    return locales;
}

/**
 * @returns {Promise<string[]>}
 */
async function getLocaleFiles(locale) {
    /** @type {string[]} */
    const results = [];

    /** @type {(dir: string) => Promise<void>} */
    const walk = async (dir) => {
        const entries = await fs.readdir(dir);
        const matched = entries.filter((f) => f === `${locale}.config` || f.endsWith(`.${locale}.config`));
        results.push(...matched);

        for (const e of entries) {
            const p = `${dir}/${e}`;
            const stat = await fs.stat(p);
            if (stat.isDirectory()) {
                walk(p);
            }
        }
    };

    await walk(LOCALES_ROOT);

    return results;
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
    return translation.sentences.map((s) => s.trans).join('\n').replaceAll(/\n+/g, '\n');
}

const args = process.argv.slice(2);
if (args[0] === '--message') {
    const messageId = args[1];
    translateEnMessage(messageId);
}
if (args.includes('--new-messages')) {
    translateNewEnMessages();
}
