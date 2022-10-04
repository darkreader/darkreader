import {prepareCSPMV3} from '../../../src/utils/csp';
import {isChromium} from '../../../src/utils/platform';

describe('Check that CSP matches expected one', () => {
    it('CSP should match', async () => {
        if (!isChromium) {
            return;
        }
        const manifest = await backgroundUtils.getManifest();
        const csp = prepareCSPMV3();
        expect(manifest.version === '2').toEqual(manifest.content_security_policy !== undefined);
        expect(manifest.version === '3').toEqual(manifest.content_security_policy === csp);
    });
});
