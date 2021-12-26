import DevTools from '../../../src/background/devtools';

describe('Migrate settings', () => {
    it('migrate settings from localStorage to chrome.storage', async () => {
        const dynamicFixes = '*\n\nINVERT\n.example\n\n================================\n\nexample.com\n\nINVERT\n.dynamic\n';
        const filterFixes = '*\n\nINVERT\n.example\n\n================================\n\nexample.com\n\nINVERT\n.filter\n';
        const staticThemes = '*\n\nINVERT\n.example\n\n================================\n\nexample.com\n\nINVERT\n.static\n';

        await backgroundUtils.changeLocalStorage({
            [DevTools.KEY_DYNAMIC]: dynamicFixes,
            [DevTools.KEY_FILTER]: filterFixes,
            [DevTools.KEY_STATIC]: staticThemes,
        });

        await backgroundUtils.changeChromeStorage('local', {
            [DevTools.KEY_DYNAMIC]: undefined,
            [DevTools.KEY_FILTER]: undefined,
            [DevTools.KEY_STATIC]: undefined,
        });

        await backgroundUtils.setDataIsMigratedForTesting(false);

        // Data is propagate to ExtensionData object
        const extensionData = await backgroundUtils.collectData();
        expect(extensionData.devtools.dynamicFixesText).toEqual(dynamicFixes);
        expect(extensionData.devtools.filterFixesText).toEqual(filterFixes);
        expect(extensionData.devtools.staticThemesText).toEqual(staticThemes);

        // Data is recorded into chrome.storage
        const chromeStorage = await backgroundUtils.getChromeStorage('local', [DevTools.KEY_DYNAMIC, DevTools.KEY_FILTER, DevTools.KEY_STATIC]);
        expect(chromeStorage[DevTools.KEY_DYNAMIC]).toBe(dynamicFixes);
        expect(chromeStorage[DevTools.KEY_FILTER]).toBe(filterFixes);
        expect(chromeStorage[DevTools.KEY_STATIC]).toBe(staticThemes);
    });
});
