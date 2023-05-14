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
    REQUEST_EXPORT_CSS = 'ui-bg-request-export-css',
    COLOR_SCHEME_CHANGE = 'ui-bg-color-scheme-change',
    HIDE_HIGHLIGHTS = 'ui-bg-hide-highlights'
}

export enum MessageTypeBGtoUI {
    CHANGES = 'bg-ui-changes',
    UPDATE = 'bg-ui-update'
}

export enum MessageTypeBGtoCS {
    BG_ADD_CSS_FILTER = 'bg-cs-add-css-filter',
    BG_ADD_STATIC_THEME = 'bg-cs-add-static-theme',
    BG_ADD_SVG_FILTER = 'bg-cs-add-svg-filter',
    BG_ADD_DYNAMIC_THEME = 'bg-cs-add-dynamic-theme',
    BG_EXPORT_CSS = 'bg-cs-export-css',
    BG_UNSUPPORTED_SENDER = 'bg-cs-unsupported-sender',
    BG_CLEAN_UP = 'bg-cs-clean-up',
    BG_RELOAD = 'bg-cs-reload',
    BG_FETCH_RESPONSE = 'bg-cs-fetch-response',
    BG_CSS_UPDATE = 'bg-cs-css-update'
}

export enum MessageTypeCStoBG {
    CS_COLOR_SCHEME_CHANGE = 'cs-bg-color-scheme-change',
    CS_FRAME_CONNECT = 'cs-bg-frame-connect',
    CS_FRAME_FORGET = 'cs-bg-frame-forget',
    CS_FRAME_FREEZE = 'cs-bg-frame-freeze',
    CS_FRAME_RESUME = 'cs-bg-frame-resume',
    CS_FETCH = 'cs-bg-fetch',
    CS_DARK_THEME_DETECTED = 'cs-bg-dark-theme-detected',
    CS_DARK_THEME_NOT_DETECTED = 'cs-bg-dark-theme-not-detected',
    CS_LOG = 'cs-bg-log'
}

export enum MessageTypeCStoUI {
    CS_EXPORT_CSS_RESPONSE = 'cs-ui-export-css-response'
}
