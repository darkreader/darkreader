import {timeout} from '../../support/test-utils';

describe('Export settings', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('Should trigger settings export', async () => {
        await timeout(1000);
        const p = new Promise<void>((resolve) => backgroundUtils.onDownload(resolve));
        await popupUtils.saveFile('example', 'content');
        expect(await p).toEqual({
            ok: true,
            mime: 'text/plain',
            type: 'download',
        });
    });
});
