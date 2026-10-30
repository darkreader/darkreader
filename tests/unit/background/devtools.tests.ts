import {expect, test} from '@jest/globals';

import ConfigManager from '../../../src/background/config-manager';
import DevTools from '../../../src/background/devtools';

test('Saved Dev tools overrides are loaded on startup', async () => {
    const saved: Record<string, string> = {
        dev_detector_hints: 'example.com\n\nTARGET\nhtml\n\nMATCH\n.dark\n',
        dev_dynamic_theme_fixes: 'example.com\n\nCSS\nh1 { color: red; }\n',
        dev_inversion_fixes: 'example.com\n\nINVERT\nimg\n',
        dev_static_themes: 'example.com\n\nNO COMMON\n',
    };
    globalThis.chrome = {
        runtime: {},
        storage: {
            local: {
                get: (key: string, callback: (result: Record<string, string>) => void) => callback({[key]: saved[key]}),
            },
        },
    } as unknown as typeof chrome;

    await DevTools.init(() => undefined);

    expect(ConfigManager.overrides).toEqual({
        darkSites: null,
        detectorHints: saved.dev_detector_hints,
        dynamicThemeFixes: saved.dev_dynamic_theme_fixes,
        inversionFixes: saved.dev_inversion_fixes,
        staticThemes: saved.dev_static_themes,
    });
});
