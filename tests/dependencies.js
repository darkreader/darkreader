import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageLockPath = resolve(__dirname, '../package-lock.json');

async function readJSON(path) {
    return await JSON.parse((await readFile(path)).toString());
}

function checkDependency({resolved, integrity}) {
    if (!(
        (resolved === undefined ||
        resolved.startsWith('https://registry.npmjs.org/')) &&
        (integrity === undefined ||
        integrity.startsWith('sha512-'))
    )) {
        throw new Error('Invalid dependency', resolved);
    }
}

/**
 * Check that every dependency (including transitive dependencies) is hosted on NPM and not
 * in some random URL/git/GitHub repo.
 */
export async function checkDependencies() {
    const packageLock = await readJSON(packageLockPath);

    const stack = [packageLock.packages];
    while (stack.length > 0) {
        const curr = stack.pop();
        for (const packageName in curr) {
            if (packageName === '') {
                continue;
            }
            checkDependency(curr[packageName]);
            if (curr[packageName].dependencies) {
                stack.push(curr[packageName].dependencies);
            }
        }
    }
}

await checkDependencies();
