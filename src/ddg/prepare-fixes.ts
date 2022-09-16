import fs from 'fs';
import path from 'path';
import url from 'url';
import {parseDynamicThemeFixes} from '../generators/dynamic-theme';
import {getDomain} from '../generators/utils/parse';

const filePath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '../src/config/dynamic-theme-fixes.config');
const destPath = path.join(url.fileURLToPath(new URL('.', import.meta.url)), '../ddg/dynamic-theme-fixes.json');

async function prepareDynamicThemeFixes() {
    const file = (await fs.promises.readFile(filePath)).toString();
    const fixes = parseDynamicThemeFixes(file);
    const index: {[domain: string]: number[]} = {};
    for (let i = 0; i < fixes.length; i++) {
        const fix = fixes[i];
        for (const url of fix.url) {
            const domain = getDomain(url);
            if (index[domain] === undefined) {
                index[domain] = [];
            }
            index[domain].push(i);
        }
    }
    console.log(destPath)
    await fs.promises.writeFile(destPath, JSON.stringify({index, fixes}, null, 4));
}

prepareDynamicThemeFixes().then(() => console.log('Finished'));
