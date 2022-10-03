// @ts-check
import {exec} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFile, writeFile} from 'node:fs/promises';
import {log} from './utils.js';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const packagePath = `${cwd}/package.json`;

async function getOutdated() {
    return /** @type {Promise<object | null>} */(new Promise((resolve, reject) => {
        exec('npm outdated --json', {cwd}, (error, stdout) => {
            if (!error) {
                log.error('Nothing to upgrade');
                reject();
                return;
            }

            const packages = JSON.parse(stdout.toString());
            resolve(packages);
        });
    }));
}

/**
 *
 * @param {string} script
 * @returns {Promise<void>}
 */
async function command(script) {
    return (new Promise((resolve, reject) => {
        exec(script, {cwd}, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    }));
}

async function buildAll() {
    await command('npm run build -- --release --api --chrome --chrome-mv3 --firefox --thunderbird');
}

async function patchPackage(outdated) {
    const original = JSON.parse((await readFile(packagePath)).toString());
    for (const pkg in outdated) {
        original.devDependencies[pkg] = outdated[pkg].latest;
    }
    return original;
}

async function main() {
    const outdated = await getOutdated();
    if (!outdated){
        return;
    }

    await buildAll();
    await command('mv build build-old');
    await command('mv darkreader.js darkreader-old.js');
    log.ok('Built old code');

    const patched = await patchPackage(outdated);
    log.ok('Created package.json');
    await writeFile(packagePath, `${JSON.stringify(patched, null, 2)}\n`);
    log.ok('Wrote package.json');
    await command('npm i');
    log.ok('Installed new dependencies');
    await buildAll();
    log.ok('Built new code');
    await command('diff -r build-old build');
    await command('diff darkreader-old.js darkreader.js');
    log.ok('Dependency upgrade does not result in change to built output');

    await command('git add package.json package-lock.json');
    await command('git commit -m "Bump dependencies"');
    log.ok('Created commit');
    // TODO: when moving this to CI, provide branch name in CI config, along with
    // a token
    await command('git push origin HEAD:bump-dependencies');
    log.ok('Pushed to GitHub');
}

main().catch(() => log.error('Could not automatically upgrade dependencies'));
