/**
 * NOTE: This test deletes ./build and ./darkreader.js
 *       (but does not run automatically)
 */
import {forka} from './utils';
import {resolve, join} from 'path';
import {tmpdir} from 'os';
import {mkdtemp, rm} from 'fs/promises';

const rootPath = (path: string) => resolve(__dirname, '../..', path);
const buildModule = rootPath('tasks/build.js');

describe.skip('build.js', () => {
    it('Builds from a different dir', async () => {
        // Build from temp dir instead of root dir
        const cwd = await mkdtemp(join(tmpdir()));
        await rm(rootPath('build'), {recursive: true, force: true});
        await rm(rootPath('darkreader.js'), {force: true});

        // Fire
        const {code, stdout} = await forka(buildModule, ['--debug', '--release', '--api'], {cwd});

        expect(stdout).toBeDefined();
        expect(stdout).toInclude('MISSION PASSED');
        expect(code).toBe(0);
    }, 60000);
});
