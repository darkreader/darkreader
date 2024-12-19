import {DEFAULT_SETTINGS, DEFAULT_THEME} from '../../../src/defaults';
import type {Theme, UserSettings} from '../../../src/definitions';
import {ThemeEngine} from '../../../src/generators/theme-engines';
import {AutomationMode} from '../../../src/utils/automation';
import {validateSettings, validateTheme} from '../../../src/utils/validation';

test('Settings Validation', () => {
    const defaultTheme = JSON.parse(JSON.stringify(DEFAULT_THEME));
    let themeValidation = validateTheme(defaultTheme);
    expect(themeValidation.errors).toEqual([]);
    expect(defaultTheme).toEqual(DEFAULT_THEME);

    const partTheme = {
        brightness: 125,
        contrast: -50,
    };
    themeValidation = validateTheme(partTheme as any);
    expect(themeValidation.errors.length).toBe(1);
    expect(partTheme).toEqual({
        brightness: 125,
        contrast: DEFAULT_THEME.contrast,
    });

    const wonkyTheme = {
        mode: 'dark',
        brightness: 250,
        contrast: -50,
        grayscale: false,
        sepia: 105,
        useFont: 'ok',
        fontFamily: '',
        textStroke: 2,
        engine: 'dymanic',
        stylesheet: 3,
        darkSchemeBackgroundColor: 'red',
        darkSchemeTextColor: '#abc12x',
        lightSchemeBackgroundColor: '',
        lightSchemeTextColor: '#ffffff00',
        scrollbarColor: false,
        selectionColor: 'green',
        styleSystemControls: null as boolean | null,
        lightColorScheme: '',
        darkColorScheme: false,
        immediateModify: 1,
    };
    themeValidation = validateTheme(wonkyTheme as any);
    expect(themeValidation.errors.length).toBeGreaterThan(0);
    expect(wonkyTheme as any).toEqual(DEFAULT_THEME);

    const defaultSet = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    let validation = validateSettings(defaultSet);
    expect(validation.errors).toEqual([]);
    expect(defaultSet).toEqual(DEFAULT_SETTINGS);

    const wonkySet = {
        schemeVersion: 'x',
        enabled: '',
        fetchNews: null as boolean | null,
        theme: {
            mode: 'dark',
            brightness: 250,
            contrast: -50,
            grayscale: false,
            sepia: 105,
            useFont: 'ok',
            fontFamily: '',
            textStroke: 2,
            engine: 'dymanic',
            stylesheet: 3,
            darkSchemeBackgroundColor: 'red',
            darkSchemeTextColor: '#abc12x',
            lightSchemeBackgroundColor: '',
            lightSchemeTextColor: '#ffffff00',
            scrollbarColor: false,
            selectionColor: 'green',
            styleSystemControls: null as boolean | null,
            lightColorScheme: '',
            darkColorScheme: false,
            immediateModify: 1,
        },
        presets: [
            {id: '', name: 'P1', urls: ['a.com'], theme: {brightness: 100}},
            {id: 'p2', name: '', urls: ['a.com'], theme: {brightness: 100}},
            {id: 'p3', name: 'P3', urls: [], theme: {brightness: 100}},
            {id: 'p4', name: 'P4', urls: ['a.com'], theme: {brightness: -50}},
            {id: 'p5', name: 'P5', urls: ['a.com'], theme: {brightness: 100}},
            {id: 'p6', urls: ['a.com'], theme: {brightness: 100}},
            {id: 'p7', name: 'P7', urls: ['a.com'], theme: null},
            null,
        ],
        customThemes: [
            {url: [] as any[], theme: {brightness: 100}},
            {url: [''], theme: {brightness: 100}},
            {url: ['a.com'], theme: {brightness: 100}},
            {url: ['a.com'], theme: {brightness: -50}},
            {url: ['a.com']},
            {url: ['a.com'], theme: null},
            null,
        ],
        disabledFor: ['a.com', '', 'b.com'],
        enabledFor: {0: 'a.com', 1: 'b.com'},
        enabledByDefault: true,
        changeBrowserTheme: 1,
        syncSettings: null as boolean | null,
        syncSitesFixes: 0,
        automation: {
            enabled: false,
            behavior: 'OnOff',
            mode: '',
        },
        time: {
            activation: '10:00PM',
            deactivation: '19:00',
        },
        location: {
            latitude: 59,
            longitude: '5.3',
        },
        previewNewDesign: '',
        previewNewestDesign: 2,
        enableForPDF: null as boolean | null,
        enableForProtectedPages: 'ok',
        enableContextMenus: 'yes',
        detectDarkTheme: 'no',
    };
    validation = validateSettings(wonkySet as any);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(wonkySet as any).toEqual({
        ...DEFAULT_SETTINGS,
        disabledFor: ['a.com', 'b.com'],
        presets: [{id: 'p5', name: 'P5', urls: ['a.com'], theme: {brightness: 100}}],
        customThemes: [{url: ['a.com'], theme: {brightness: 100}}],
    });

    const nullishSet = {
        theme: null as any,
        presets: null as any,
        customThemes: null as any,
        time: null as any,
        location: null as any,
    };
    validation = validateSettings(nullishSet);
    expect(validation.errors.length).toBe(5);
    expect(nullishSet).toEqual({
        theme: DEFAULT_THEME,
        presets: DEFAULT_SETTINGS.presets,
        customThemes: DEFAULT_SETTINGS.customThemes,
        time: DEFAULT_SETTINGS.time,
        location: DEFAULT_SETTINGS.location,
    });

    const validSet: UserSettings = {
        schemeVersion: 2,
        enabled: true,
        fetchNews: true,
        theme: {
            mode: 0,
            brightness: 125,
            contrast: 50,
            grayscale: 25,
            sepia: 5,
            useFont: true,
            fontFamily: 'Comic Sans',
            textStroke: 0.5,
            engine: ThemeEngine.dynamicTheme,
            stylesheet: '.x { color: red; }',
            darkSchemeBackgroundColor: '#abcdef',
            darkSchemeTextColor: '#abc123',
            lightSchemeBackgroundColor: '#ff0000',
            lightSchemeTextColor: '#ffffff',
            scrollbarColor: '',
            selectionColor: 'auto',
            styleSystemControls: false,
            lightColorScheme: 'Lightness',
            darkColorScheme: 'Darkness',
            immediateModify: true,
        },
        presets: [
            {id: 'p5', name: 'P5', urls: ['a.com'], theme: {brightness: 100} as Theme},
        ],
        customThemes: [
            {url: ['a.com'], theme: {brightness: 100} as Theme},
        ],
        disabledFor: ['a.com', 'b.com'],
        enabledFor: ['c.com'],
        enabledByDefault: false,
        changeBrowserTheme: true,
        syncSettings: false,
        syncSitesFixes: true,
        automation: {
            enabled: true,
            mode: AutomationMode.LOCATION,
            behavior: 'OnOff',
        },
        time: {
            activation: '18:00',
            deactivation: '7:00',
        },
        location: {
            latitude: 59,
            longitude: 53,
        },
        previewNewDesign: true,
        previewNewestDesign: false,
        enableForPDF: false,
        enableForProtectedPages: true,
        enableContextMenus: true,
        detectDarkTheme: true,
    };
    const validSetCopy = JSON.parse(JSON.stringify(validSet));
    validation = validateSettings(validSet);
    expect(validation.errors).toEqual([]);
    expect(validSet).toEqual(validSetCopy);
});
