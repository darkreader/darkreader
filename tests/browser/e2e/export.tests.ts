import {timeout} from '../../support/test-utils';

describe('Export settings', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('Should download file', async () => {
        await timeout(1000);
        const p = new Promise<{ok: boolean}>((resolve) => backgroundUtils.onDownload(resolve));
        await popupUtils.saveFile('example', 'content');
        expect((await p).ok).toBe(true);
        if (product === 'firefox') {
            await timeout(1000);
        }
    });
});
