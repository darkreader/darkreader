import {readFile} from 'fs';
import {resolve as resolvePath} from 'path';
import {compress, decompress} from '../../src/utils/compression';

function readConfig(fileName) {
    return new Promise<string>((resolve, reject) => {
        readFile(resolvePath(__dirname, '../../src/config/', fileName), {encoding: 'utf-8'}, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    });
}

test('Compression', async () => {
    const dark_sites = await readConfig('dark-sites.config');
    expect(dark_sites).toBe(decompress(compress(dark_sites)));
    const inversion_config = await readConfig('inversion-fixes.config');
    expect(inversion_config).toBe(decompress(compress(inversion_config)));
    const dynamic_theme_config = await readConfig('dynamic-theme-fixes.config');
    expect(dynamic_theme_config).toBe(decompress(compress(dynamic_theme_config)));
    const static_config = await readConfig('static-themes.config');
    expect(static_config).toBe(decompress(compress(static_config)));
});