import fs from 'node:fs/promises';

import {rootPath} from '../../support/test-utils';

async function testLocalesDir(dir: string) {
    const entries = await fs.readdir(rootPath(dir));
    const files: string[] = [];
    const folders: string[] = [];
    for (const path of entries) {
        const stat = await fs.stat(rootPath(dir, path));
        if (stat.isDirectory()) {
            folders.push(path);
        } else {
            files.push(path);
        }
    }

    const enLocaleFile = files.find((f) => f === 'en.config' || f.endsWith('.en.config'))!;
    const enLocale = await fs.readFile(`${dir}/${enLocaleFile}`, 'utf8');
    const enLines = enLocale.split('\n');
    const locales: string[] = [];

    for (const file of files) {
        const locale = await fs.readFile(`${dir}/${file}`, 'utf8');
        locales.push(locale);
    }

    function compareLinesToEnLocale(predicate: (en: string, loc: string) => boolean) {
        return locales.every((loc, j) => {
            const lines = loc.split('\n');
            for (let i = 0; i < Math.min(lines.length, enLines.length); i++) {
                if (!predicate(enLines[i], lines[i])) {
                    console.error(`${files[j]}, line ${i + 1}`);
                    return false;
                }
            }
            return true;
        });
    }

    // Line count is the same
    expect(locales.every((loc) => loc.split('\n').length === enLines.length)).toBe(true);

    // Locale ends with new line
    expect(locales.every((loc) => loc.endsWith('\n')));

    // Line spaces are the same
    expect(compareLinesToEnLocale((en, loc) => !en === !loc)).toBe(true);

    // Message codes are on the same positions
    expect(compareLinesToEnLocale((en, loc) => !en.startsWith('@') || (en.startsWith('@') && en === loc))).toBe(true);

    // No extra whitespace
    expect(compareLinesToEnLocale((en, loc) => loc.trim() === loc)).toBe(true);

    for (const subDir of folders) {
        await testLocalesDir(`${dir}/${subDir}`);
    }
}

test('Locales', async () => {
    await testLocalesDir('src/_locales');
});
