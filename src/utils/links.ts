import {getUILanguage} from './locales';

export const BLOG_URL = 'https://darkreader.org/blog/';
export const DEVTOOLS_DOCS_URL = 'https://github.com/alexanderby/darkreader#how-to-contribute';
export const DONATE_URL = 'https://opencollective.com/darkreader';
export const GITHUB_URL = 'https://github.com/darkreader/darkreader';
export const PRIVACY_URL = 'https://darkreader.org/privacy/';
export const TWITTER_URL = 'https://twitter.com/darkreaderapp';

const helpLocales = [
    'be',
    'cs',
    'de',
    'en',
    'fr',
    'it',
    'ru',
];

export function getHelpURL() {
    const locale = getUILanguage();
    const matchLocale = helpLocales.find((hl) => hl === locale) || helpLocales.find((hl) => locale.startsWith(hl)) || 'en';
    return `https://darkreader.org/help/${matchLocale}/`;
}

export function getBlogPostURL(postId: string) {
    return `${BLOG_URL}${postId}/`;
}
