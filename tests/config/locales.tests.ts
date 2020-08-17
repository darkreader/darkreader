import {readFile as fsReadFile, readdir as fsReadDir} from 'fs';
import {resolve as resolvePath} from 'path';

function readDir(dir) {
    return new Promise<string[]>((resolve, reject) => {
        fsReadDir(resolvePath(__dirname, dir), (err, files) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(files);
        });
    });
}

function readLocale(name) {
    return new Promise<string>((resolve, reject) => {
        fsReadFile(resolvePath(__dirname, '../../src/_locales/', name), {encoding: 'utf-8'}, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

test('Locales', async () => {
    const files = await readDir('../../src/_locales');
    const enLocale = await readLocale('en.config');
    const enLines = enLocale.split('\n');
    const locales: string[] = [];
    for (const file of files) {
        const locale = await readLocale(file);
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
});
