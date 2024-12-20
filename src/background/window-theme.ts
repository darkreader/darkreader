import type {Theme} from '../definitions';
import {modifyBackgroundColor, modifyForegroundColor, modifyBorderColor} from '../inject/dynamic-theme/modify-colors';
import type {RGBA} from '../utils/color';
import {parseColorWithCache} from '../utils/color';

// TODO: remove type after dependency update
declare const browser: {
    theme: {
        update: ((theme: any) => Promise<void>);
        reset: (() => Promise<void>);
    };
};

const themeColorTypes: { [key: string]: 'bg' | 'text' | 'border' } = {
    accentcolor: 'bg',
    button_background_active: 'text',
    button_background_hover: 'text',
    frame: 'bg',
    icons: 'text',
    icons_attention: 'text',
    ntp_background: 'bg',
    ntp_text: 'text',
    popup: 'bg',
    popup_border: 'bg',
    popup_highlight: 'bg',
    popup_highlight_text: 'text',
    popup_text: 'text',
    sidebar: 'bg',
    sidebar_border: 'border',
    sidebar_text: 'text',
    tab_background_text: 'text',
    tab_line: 'bg',
    tab_loading: 'bg',
    tab_selected: 'bg',
    textcolor: 'text',
    toolbar: 'bg',
    toolbar_bottom_separator: 'border',
    toolbar_field: 'bg',
    toolbar_field_border: 'border',
    toolbar_field_border_focus: 'border',
    toolbar_field_focus: 'bg',
    toolbar_field_separator: 'border',
    toolbar_field_text: 'text',
    toolbar_field_text_focus: 'text',
    toolbar_text: 'text',
    toolbar_top_separator: 'border',
    toolbar_vertical_separator: 'border',
};

const $colors: { [key: string]: string } = {
    // 'accentcolor' is the deprecated predecessor of 'frame'.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#colors
    accentcolor: '#111111',
    frame: '#111111',
    ntp_background: 'white',
    ntp_text: 'black',
    popup: '#cccccc',
    popup_text: 'black',
    sidebar: '#cccccc',
    sidebar_border: '#333',
    sidebar_text: 'black',
    tab_background_text: 'white',
    tab_loading: '#23aeff',
    // 'textcolor' is the predecessor of 'tab_background_text'.
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme#colors
    textcolor: 'white',
    toolbar: '#707070',
    toolbar_field: 'lightgray',
    toolbar_field_text: 'black',
};

export function setWindowTheme(theme: Theme): void {
    const colors = Object.entries($colors).reduce((obj: { [key: string]: string }, [key, value]) => {
        const type: 'bg' | 'text' | 'border' = themeColorTypes[key];
        const modify: ((rgb: RGBA, theme: Theme, shouldRegister: boolean) => string) = {
            'bg': modifyBackgroundColor,
            'text': modifyForegroundColor,
            'border': modifyBorderColor,
        }[type];
        const rgb = parseColorWithCache(value)!;
        const modified = modify(rgb, theme, false);
        obj[key] = modified;
        return obj;
    }, {});
    if (typeof browser !== 'undefined' && browser.theme && browser.theme.update) {
        browser.theme.update({colors});
    }
}

export function resetWindowTheme(): void {
    if (typeof browser !== 'undefined' && browser.theme && browser.theme.reset) {
        // BUG: resets browser theme to entire
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1415267
        browser.theme.reset();
    }
}
