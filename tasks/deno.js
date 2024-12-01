import {resolve} from 'node:path';

import {readJSON, writeJSON} from './utils.js';

function resolvePath(path) {
    return resolve(import.meta.url.replace('file:/', ''), '../../', path);
}

function createImports(dependencies) {
    const imports = {};
    for (const name in dependencies) {
        imports[name] = `npm:${name}@${dependencies[name]}`;
    }
    return imports;
}

function createTasks(scripts) {
    const tasks = {};
    for (const name in scripts) {
        const command = scripts[name];
        tasks[name] = command
            .replace('--max-old-space-size=3072', '')
            .replace('node ', 'deno run -A ')
            .replaceAll('npm run ', 'deno task ');
    }
    return tasks;
}

async function writeDenoJSON() {
    const packageJSON = resolvePath('package.json');
    const denoJSON = await resolvePath('deno.json');
    const pkg = await readJSON(packageJSON);

    if (pkg.dependencies) {
        console.error('TODO: support dependencies key in createImports()');
    }
    const imports = createImports(pkg.devDependencies);

    const tasks = createTasks(pkg.scripts);

    writeJSON(denoJSON, {imports, tasks});
}

async function main() {
    await writeDenoJSON();
}

main();
