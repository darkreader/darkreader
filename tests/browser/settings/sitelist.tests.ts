describe('Modifying settings', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('Modifying sync settings to contain long list', async () => {
        const newSettings = {
            enabledFor: [] as string[],
            disabledFor: [] as string[],
            syncSettings: true,
        };

        // Cumulative length should be over the browser limit on record size
        for (let i = 0; i < 1000; i ++) {
            newSettings.disabledFor.push(`example${i}.com`);
        }

        await backgroundUtils.changeSettings(newSettings);

        const extensionData = await backgroundUtils.collectData();
        expect(extensionData.settings.syncSettings).toBe(true);
        expect(extensionData.settings.disabledFor.length).toBe(1000);
    });
});
