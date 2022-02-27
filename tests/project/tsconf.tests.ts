import ts, {ExitStatus} from 'typescript';
import {dirname, join} from 'path';
import {ForkOptions} from 'child_process';
import {tmpdir} from 'os';
import {mkdtemp} from 'fs/promises';
import {forka} from './utils';

const rootDir = dirname(require.resolve('../../package.json'))
const tscModule = require.resolve('typescript/bin/tsc');

const tsProjects: Array<{ tsconfig: string }> = [
    // Browser extension
    {tsconfig: 'src'},
    // API
    {tsconfig: 'src/api'},
    // E2E tests (Jest, Puppeteer, Node.js)
    {tsconfig: 'tests/browser'},
    // Browser tests (Karma, Jasmine)
    {tsconfig: 'tests/inject'},
    // Unit tests (Jest, Node.js)
    {tsconfig: 'tests/config'},
    {tsconfig: 'tests/generators/utils'},
    {tsconfig: 'tests/utils'},
];

describe('TypeScript project config', () => {
    it.each(tsProjects)('file should parse and resolve correctly: $tsconfig', async ({tsconfig}) => {
        // Parse config from temp dir instead of root dir
        const cwd = await mkdtemp(join(tmpdir()));
        const project = join(rootDir, tsconfig, 'tsconfig.json');
        const {code, stdout} = await tsc(['--project', project, '--showConfig'], {cwd});

        expect(stdout).toStartWith('{');
        expect(code).toBe(ExitStatus.Success);
        const configJson = JSON.parse(stdout);
        const config = ts.parseJsonConfigFileContent(configJson, ts.sys, project);

        expect(config.raw).toMatchSnapshot();
    });

    // Slow and not executed automatically
    it.skip.each(tsProjects)('should compile without errors: $tsconfig', async ({tsconfig}) => {
        // Compile config from temp dir instead of root dir
        const cwd = await mkdtemp(join(tmpdir()));
        const project = join(rootDir, tsconfig, 'tsconfig.json');
        const {code, stdout} = await tsc(['--project', project, '--noEmit'], {cwd});
        expect(stdout).toBeUndefined();
        expect(code).toBe(ExitStatus.Success);
    }, 60000);
});

async function tsc(args: string[], options?: ForkOptions) {
    return forka(tscModule, args, {silent: true, ...options});
}
