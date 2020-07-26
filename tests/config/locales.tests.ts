import {readFileSync as fsReadFile, readdirSync as fsReadDir} from 'fs';
import {resolve as resolvePath} from 'path';

function readDir(dir: string) {
    return fsReadDir(resolvePath(__dirname, dir));
}

function readLocale(name: string) {
    return fsReadFile(resolvePath(__dirname, '../../src/_locales/', name), {encoding: 'utf-8'});
}

describe('Locales', () => {
    const files = readDir('../../src/_locales');
    const enLocale = readLocale('en.config');
    const enLines = enLocale.split('\n');

    function compareLinesToEnLocale(loc: string, predicate: (en: string, loc: string) => boolean) {
        const lines = loc.split('\n');
        for (let i = 0, len = Math.min(lines.length, enLines.length); i < len; i++) {
            if (!predicate(enLines[i], lines[i])) {
                console.error(`${loc}, line ${i + 1}`);
                return false;
            }
        }
        return true;
    }

    it.each(files)('%s', (file) => {
        const locale = readLocale(file);

        // Line count is the same
        expect(locale.split('\n').length).toEqual(enLines.length);

        // Locale ends with new line
        expect(locale.endsWith('\n')).toBe(true);

        // Line spaces are the same
        expect(compareLinesToEnLocale(locale, (en, loc) => !en === !loc)).toBe(true);

        // Message codes are on the same positions
        expect(compareLinesToEnLocale(locale, (en, loc) => !en.startsWith('@') || (en.startsWith('@') && en === loc))).toBe(true);

        // No extra whitespace
        expect(compareLinesToEnLocale(locale, (en, loc) => loc.trim() === loc)).toBe(true);
    });
});
