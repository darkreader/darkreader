import {parse, RGBA} from '../utils/color';
import {modifyBackgroundColor, modifyForegroundColor, modifyBorderColor} from '../generators/modify-colors';
import {FilterConfig} from '../definitions';

declare const browser: {
    theme: {
        update: ((theme: any) => Promise<void>);
        reset: (() => Promise<void>);
    };
};

const themeColorTypes = {
    accentcolor: 'bg',
    button_background_active: 'text',
    button_background_hover: 'text',
    icons: 'text',
    icons_attention: 'text',
    popup: 'bg',
    popup_border: 'bg',
    popup_highlight: 'bg',
    popup_highlight_text: 'text',
    popup_text: 'text',
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
    toolbar_field_text: 'text',
    toolbar_field_text_focus: 'text',
    toolbar_field_separator: 'border',
    toolbar_text: 'text',
    toolbar_top_separator: 'border',
    toolbar_vertical_separator: 'border',
}

const $colors = {
    accentcolor: '#111111',
    popup: '#cccccc',
    popup_text: 'black',
    tab_line: '#23aeff',
    tab_loading: '#23aeff',
    textcolor: 'white',
    toolbar: '#707070',
    toolbar_field: 'lightgray',
    toolbar_field_text: 'black',
};

export function setWindowTheme(filter: FilterConfig) {
    const colors = Object.entries($colors).reduce((obj, [key, value]) => {
        const type = themeColorTypes[key];
        const modify: ((rgb: RGBA, filter: FilterConfig) => string) = {
            'bg': modifyBackgroundColor,
            'text': modifyForegroundColor,
            'border': modifyBorderColor,
        }[type];
        const rgb = parse(value);
        const modified = modify(rgb, filter);
        obj[key] = modified;
        return obj;
    }, {});
    if (typeof browser !== 'undefined' && browser.theme && browser.theme.update) {
        browser.theme.update({colors});
    }
}

export function resetWindowTheme() {
    if (typeof browser !== 'undefined' && browser.theme && browser.theme.reset) {
        // BUG: resets browser theme to entire
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1415267
        browser.theme.reset();
    }
}
