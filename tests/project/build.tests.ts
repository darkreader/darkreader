import {timeout} from '../support/test-utils';
import {childClosed, watchStream} from './utils';
import {join, resolve} from 'path';
import {tmpdir} from 'os';
import {mkdtemp} from 'fs/promises';
import {fork} from 'child_process';

const rootPath = (path: string) => resolve(__dirname, '../..', path);
const buildModule = rootPath('tasks/build.js');

describe('tasks/build-js.js', () => {
    it('should respond to SIGINT signals by exiting immediately', async () => {
        expect.assertions(3);
        const tmpDir: string = await mkdtemp(join(tmpdir()));
        const wantToWaitNoMoreThan = 500;

        // Execute build
        // Give it a chance to reach compilation stage
        const child = fork(buildModule, ['--debug'], {cwd: tmpDir, silent: true});

        // Wait for "clean" step to complete
        await watchStream(child.stdout).forMatch(/ clean \(\d+ms\)/);
        // Let "bundle-js" to get started
        await timeout(500);

        // Fire!
        child.kill('SIGINT');

        // Wait for close
        await childClosed(child, {timeout: wantToWaitNoMoreThan});

        expect(child.killed).toBeTrue();
        expect(child.exitCode).toBeGreaterThan(0);

        // By now, "bundle-js" step should not have completed normally
        expect((child.stdout.read() || '')).not.toMatch(/ bundle-js \(\d+ms\)/);
    });
});

describe('tasks/build.js', () => {
    // Slow test (skipped by default)
    it.skip('should build successfully from an unexpected working directory', async () => {
        const tmpDir: string = await mkdtemp(join(tmpdir()));

        // Fire
        const child = fork(buildModule, ['--debug', '--release', '--api'], {cwd: tmpDir, silent: true});

        const {stdout} = await childClosed(child);
        expect(stdout).toInclude('MISSION PASSED');
        expect(child.exitCode).toBe(0);
    }, 60000);
});
