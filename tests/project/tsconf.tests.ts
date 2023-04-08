import ts, {ExitStatus} from 'typescript';
import {dirname, join} from 'path';
import {fork} from 'child_process';
import {tmpdir} from 'os';
import {mkdtemp} from 'fs/promises';
import {childClosed} from './utils';

const rootDir = dirname(require.resolve('../../package.json'));
const tsc = require.resolve('typescript/bin/tsc');

const tsProjects: Array<{tsconfig: string, module?: 'es2020'}> = [
    // Browser extension
    {tsconfig: 'src'},
    // API
    {tsconfig: 'src/api'},
    // E2E tests (Jest, Puppeteer, Node.js)
    {tsconfig: 'tests/browser', module: 'es2020'},
    // Browser tests (Karma, Jasmine)
    {tsconfig: 'tests/inject'},
    // Unit tests (Jest, Node.js)
    {tsconfig: 'tests/unit'},
];

describe('TypeScript project config', () => {
    it.each(tsProjects)('file should parse and resolve correctly: $tsconfig', async ({tsconfig}) => {
        // Parse config from temp dir instead of root dir
        const cwd = await mkdtemp(join(tmpdir(), 'darkreader'));
        const project = join(rootDir, tsconfig, 'tsconfig.json');

        // Fire
        const child = fork(tsc, ['--project', project, '--showConfig'], {silent: true, cwd});

        const {response} = await childClosed(child, {serialization: 'json'});
        expect(child.exitCode).toBe(ExitStatus.Success);
        const config = ts.parseJsonConfigFileContent(response, ts.sys, project);
        expect(config.raw).toMatchSnapshot();
    }, 100000);

    // Slow test (run using `npm run test:project`)
    it.each(tsProjects)('should compile without errors: $tsconfig', async ({tsconfig, module}) => {
        // Compile config from temp dir instead of root dir
        const cwd = await mkdtemp(join(tmpdir(), 'darkreader'));
        const project = join(rootDir, tsconfig, 'tsconfig.json');

        // Fire
        const args = ['--project', project, '--noEmit'];
        if (module) {
            args.push('--module');
            args.push(module);
        }
        const child = fork(tsc, args, {silent: true, cwd});
        child.stderr.on('data', (d) => console.error(d.toString()));
        child.stdout.on('data', (d) => console.error(d.toString()));
        await childClosed(child);
        expect(child.exitCode).toBe(ExitStatus.Success);
    }, 60000);
});
