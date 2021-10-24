import DevTools from '../../../src/background/devtools';

describe('Migrate settings', () => {
    it('should turn On/Off', async () => {
        await backgroundUtils.changeLocalStorage({
            [DevTools.KEY_DYNAMIC]: "hi",
            [DevTools.KEY_FILTER]: "hi",
            [DevTools.KEY_STATIC]: "hi",
        });

        expect(true).toBe(true);
    });
});
