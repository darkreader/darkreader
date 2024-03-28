import {getUILanguage} from './locales';

export const HOMEPAGE_URL = 'https://darkreader.org';
export const BLOG_URL = 'https://darkreader.org/blog/';
export const NEWS_URL = 'https://darkreader.org/blog/posts.json';
export const DEVTOOLS_DOCS_URL = 'https://github.com/darkreader/darkreader/blob/main/CONTRIBUTING.md';
export const DONATE_URL = 'https://opencollective.com/darkreader/donate';
export const GITHUB_URL = 'https://github.com/darkreader/darkreader';
export const MOBILE_URL = 'https://darkreader.org/tips/mobile/';
export const PRIVACY_URL = 'https://darkreader.org/privacy/';
export const TWITTER_URL = 'https://twitter.com/darkreaderapp';
export const UNINSTALL_URL = 'https://darkreader.org/goodluck/';
export const HELP_URL = 'https://darkreader.org/help';
export const CONFIG_URL_BASE = 'https://raw.githubusercontent.com/darkreader/darkreader/main/src/config';

const helpLocales = [
    'be',
    'cs',
    'de',
    'en',
    'es',
    'fr',
    'it',
    'nl',
    'pt',
    'ru',
    'sr',
    'tr',
    'zh-CN',
    'zh-TW',
];

export function getHelpURL(): string {
    const locale = getUILanguage();
    const matchLocale = helpLocales.find((hl) => hl === locale) || helpLocales.find((hl) => locale.startsWith(hl)) || 'en';
    return `${HELP_URL}/${matchLocale}/`;
}

export function getBlogPostURL(postId: string): string {
    return `${BLOG_URL}${postId}/`;
}
