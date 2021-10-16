describe('Modifying settings', () => {
    it('Modifying sync settings to contain long list', async () => {
        const newSettings = {
            siteList: [] as string[],
            siteListEnabled: [] as string[],
            syncSettings: true,
        };

        // Cummulative length should be over the browser limit on record size.
        for (let i = 0; i < 1000; i ++) {
            newSettings.siteList.push(`example${i}.com`);
        }

        await backgroundUtils.changeSettings(newSettings);

        const extensionData = await backgroundUtils.collectData();
        expect(extensionData.settings.syncSettings).toBe(true);
        expect(extensionData.settings.siteList.length).toBe(1000);
    });
});
