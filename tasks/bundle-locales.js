// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

import {getDestDir, absolutePath} from './paths.js';
import {PLATFORM} from './platform.js';
import * as reload from './reload.js';
import {createTask} from './task.js';
import {readFile, writeFile} from './utils.js';

const srcLocalesDir = 'src/_locales';

/** @type {(filePath: string) => Promise<string>} */
async function bundleLocale(filePath) {
    let file = await readFile(filePath);
    file = file.replace(/^#.*?$/gm, '');

    const messages = {};

    const regex = /@([a-z0-9_]+)/ig;
    let match;
    while ((match = regex.exec(file))) {
        const messageName = match[1];
        const messageStart = match.index + match[0].length;
        let messageEnd = file.indexOf('@', messageStart);
        if (messageEnd < 0) {
            messageEnd = file.length;
        }
        messages[messageName] = {
            message: file.substring(messageStart, messageEnd).trim(),
        };
    }

    return `${JSON.stringify(messages, null, 4)}\n`;
}

async function bundleLocales(srcLocalesDir, {platforms, debug}) {
    const absoluteSrcLocalesDir = absolutePath(srcLocalesDir);
    const list = await fs.readdir(absoluteSrcLocalesDir);
    for (const name of list) {
        if (!name.endsWith('.config')) {
            continue;
        }
        const locale = await bundleLocale(`${absoluteSrcLocalesDir}/${name}`);
        const fileName = name.substring(name.lastIndexOf('/') + 1);
        await writeFiles(locale, fileName, {platforms, debug});
    }
}

async function writeFiles(data, fileName, {platforms, debug}){
    const locale = fileName.substring(0, fileName.lastIndexOf('.')).replace('-', '_');
    const getOutputPath = (dir) => `${dir}/_locales/${locale}/messages.json`;
    const enabledPlatforms = Object.values(PLATFORM).filter((platform) => platform !== PLATFORM.API && platforms[platform]);
    for (const platform of enabledPlatforms) {
        const dir = getDestDir({debug, platform});
        await writeFile(getOutputPath(dir), data);
    }
}

/**
 * @param {string} srcLocalesDir
 * @returns {ReturnType<typeof createTask>}
 */
export function createBundleLocalesTask(srcLocalesDir) {
    /** @type {(changedFiles: string[], watcher: any, platforms: any) => Promise<void>} */
    const onChange = async (changedFiles, _, platforms) => {
        const localesSrcDir = absolutePath(srcLocalesDir);
        for (const file of changedFiles) {
            const fileName = file.substring(file.lastIndexOf(path.sep) + 1);
            const locale = await bundleLocale(`${localesSrcDir}/${fileName}`);
            await writeFiles(locale, fileName, {platforms, debug: true});
        }
        reload.reload({type: reload.FULL});
    };

    return createTask(
        'bundle-locales',
        (options) => bundleLocales(srcLocalesDir, options),
    ).addWatcher(
        [`${srcLocalesDir}/**/*.config`],
        onChange,
    );
}

export default createBundleLocalesTask(srcLocalesDir);
