import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

import {prepareCSPMV3} from '../../../src/utils/csp';

describe('Check that CSP matches expected one', () => {
    it('CSP should match', async () => {
        const file = join(__dirname, '../../../src/manifest-chrome-mv3.json');
        const manifest: chrome.runtime.Manifest = JSON.parse(await readFile(file, {encoding: 'utf-8'}));
        expect(manifest.content_security_policy).toEqual(prepareCSPMV3());
    });
});
