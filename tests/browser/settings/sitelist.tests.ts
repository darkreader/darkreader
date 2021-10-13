describe('Modifying settings', () => {
    it('Modifying sync settings to contain long list', async () => {
        const newSettings = {
            "siteList": [] as string[],
            "siteListEnabled": [] as string[],
            "syncSettings": true
        };

        // 488 is a magic value: it is the number of sites with cummulative length
        // over the browser limit on record size.
        for (let i = 0; i < 488; i ++) {
            newSettings.siteList.push(`example${i}.com`)
        }

        await backgroundUtils.changeSettings(newSettings);

        const extensionData = await backgroundUtils.collectData();
        expect(extensionData.settings.syncSettings).toBe(true);
        expect(extensionData.settings.siteList.length).toBe(488);
    });
});
