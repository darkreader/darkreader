import {getUILanguage} from './locales';

export const BLOG_URL = 'http://darkreader.org/blog/';
export const DEVTOOLS_DOCS_URL = 'https://github.com/alexanderby/darkreader#how-to-contribute';
export const DONATE_URL = 'https://opencollective.com/darkreader';
export const GITHUB_URL = 'https://github.com/darkreader/darkreader';
export const PRIVACY_URL = 'http://darkreader.org/privacy/';
export const TWITTER_URL = 'https://twitter.com/darkreaderapp';

export function getHelpURL() {
    const helpLocales = ['be', 'de', 'en', 'ru'];
    const locale = getUILanguage();
    const matchLocale = helpLocales.find((hl) => hl === locale) || helpLocales.find((hl) => locale.startsWith(hl)) || 'en';
    return `http://darkreader.org/help/${matchLocale}/`;
}

export function getBlogPostURL(postId: string) {
    return `${BLOG_URL}${postId}/`;
}
