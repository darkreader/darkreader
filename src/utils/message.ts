export enum MessageTypeUItoBG {
    GET_DATA = 'ui-bg-get-data',
    GET_DEVTOOLS_DATA = 'ui-bg-get-devtools-data',
    SUBSCRIBE_TO_CHANGES = 'ui-bg-subscribe-to-changes',
    UNSUBSCRIBE_FROM_CHANGES = 'ui-bg-unsubscribe-from-changes',
    CHANGE_SETTINGS = 'ui-bg-change-settings',
    SET_THEME = 'ui-bg-set-theme',
    TOGGLE_ACTIVE_TAB = 'ui-bg-toggle-active-tab',
    MARK_NEWS_AS_READ = 'ui-bg-mark-news-as-read',
    MARK_NEWS_AS_DISPLAYED = 'ui-bg-mark-news-as-displayed',
    LOAD_CONFIG = 'ui-bg-load-config',
    APPLY_DEV_DYNAMIC_THEME_FIXES = 'ui-bg-apply-dev-dynamic-theme-fixes',
    RESET_DEV_DYNAMIC_THEME_FIXES = 'ui-bg-reset-dev-dynamic-theme-fixes',
    APPLY_DEV_INVERSION_FIXES = 'ui-bg-apply-dev-inversion-fixes',
    RESET_DEV_INVERSION_FIXES = 'ui-bg-reset-dev-inversion-fixes',
    APPLY_DEV_STATIC_THEMES = 'ui-bg-apply-dev-static-themes',
    RESET_DEV_STATIC_THEMES = 'ui-bg-reset-dev-static-themes',
    SAVE_FILE = 'ui-bg-save-file',
    COLOR_SCHEME_CHANGE = 'ui-bg-color-scheme-change',
    HIDE_HIGHLIGHTS = 'ui-bg-hide-highlights'
}

export enum MessageTypeBGtoUI {
    CHANGES = 'bg-ui-changes',
    UPDATE = 'bg-ui-update'
}

export enum MessageTypeBGtoCS {
    ADD_CSS_FILTER = 'bg-cs-add-css-filter',
    ADD_STATIC_THEME = 'bg-cs-add-static-theme',
    ADD_SVG_FILTER = 'bg-cs-add-svg-filter',
    ADD_DYNAMIC_THEME = 'bg-cs-add-dynamic-theme',
    UNSUPPORTED_SENDER = 'bg-cs-unsupported-sender',
    CLEAN_UP = 'bg-cs-clean-up',
    RELOAD = 'bg-cs-reload',
    FETCH_RESPONSE = 'bg-cs-fetch-response',
    CSS_UPDATE = 'bg-cs-css-update'
}

export enum MessageTypeCStoBG {
    COLOR_SCHEME_CHANGE = 'cs-bg-color-scheme-change',
    FRAME_CONNECT = 'cs-bg-frame-connect',
    FRAME_FORGET = 'cs-bg-frame-forget',
    FRAME_FREEZE = 'cs-bg-frame-freeze',
    FRAME_RESUME = 'cs-bg-frame-resume',
    FETCH = 'cs-bg-fetch',
    DARK_THEME_DETECTED = 'cs-bg-dark-theme-detected',
    DARK_THEME_NOT_DETECTED = 'cs-bg-dark-theme-not-detected',
    LOG = 'cs-bg-log'
}

export enum MessageTypeCStoUI {
    EXPORT_CSS_RESPONSE = 'cs-ui-export-css-response'
}

export enum MessageTypeUItoCS {
    EXPORT_CSS = 'ui-cs-export-css'
}
