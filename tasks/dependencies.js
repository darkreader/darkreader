// @ts-check
import {exec} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

import {log} from './utils.js';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const packagePath = `${cwd}/package.json`;

async function getOutdated() {
    return /** @type {Promise<object | null>} */(new Promise((resolve, reject) => {
        exec('npm outdated --json', {cwd}, (error, stdout) => {
            const packages = JSON.parse(stdout.toString());
            if (typeof packages !== 'object') {
                log.error('Failed to check for dependencies');
                reject();
                return;
            }
            if (Object.keys(packages).length === 0) {
                log.error('All dependencies are already up to date');
                reject();
                return;
            }
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
    await command('npm run build -- --release --api --chrome-mv2 --chrome-mv3 --firefox-mv2 --thunderbird');
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

    log.ok('Building with old dependencies');
    await buildAll();
    log.ok('Built with old dependencies');
    await command('mv build build-old');
    await command('mv darkreader.js darkreader-old.js');
    await command('mv darkreader.mjs darkreader-old.mjs');
    log.ok('Moved built output');

    const patched = await patchPackage(outdated);
    log.ok('Upgrading own dependencies');
    await writeFile(packagePath, `${JSON.stringify(patched, null, 2)}\n`);
    await command('npm i');
    await command('git add package.json package-lock.json');
    await command('git commit -m "Bump own dependencies"');

    log.ok('Upgrading transitive dependencies');
    await command('npm upgrade');
    await command('git add package.json package-lock.json');
    await command('git commit -m "Bump transitive dependencies"');
    log.ok('Installed new dependencies');

    await buildAll();
    log.ok('Built with new dependencies');

    await command('diff -r build-old/release/chrome build/release/chrome');
    await command('diff -r build-old/release/chrome-mv3 build/release/chrome-mv3');
    await command('diff -r build-old/release/firefox build/release/firefox');
    await command('diff -r build-old/release/thunderbird build/release/thunderbird');
    await command('diff darkreader-old.js darkreader.js');
    await command('diff darkreader-old.mjs darkreader.mjs');
    log.ok('Dependency upgrade does not result in change to built output');

    // TODO: when moving this to CI, provide branch name in CI config, along with
    // a token
    await command('git push origin HEAD:bump-dependencies');
    log.ok('Pushed to GitHub');
}

main().catch(() => log.error('Could not automatically upgrade dependencies'));
