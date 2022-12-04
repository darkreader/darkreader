// @ts-check
import {existsSync} from 'fs';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);

const lastArg = process.argv.pop();
if (lastArg === __filename) {
    throw new Error('Error: File or directory expected as a single argument');
}

process.exit(existsSync(lastArg || '') ? 0 : 1);
