import {getUILanguage} from './locales';

export const BLOG_URL = 'https://darkreader.org/blog/';
export const DEVTOOLS_DOCS_URL = 'https://github.com/alexanderby/darkreader#how-to-contribute';
export const ABOUT_URL = 'https://github.com/agatt1/Illumify/wiki';
export const GITHUB_URL = 'https://github.com/agatt1/Illumify';
export const PRIVACY_URL = 'https://github.com/agatt1/Illumify/wiki/Privacy-Policy';

export function getHelpURL() {
    const helpLocales = ['be', 'cs', 'de', 'en', 'it', 'ru'];
    const locale = getUILanguage();
    const matchLocale = helpLocales.find((hl) => hl === locale) || helpLocales.find((hl) => locale.startsWith(hl)) || 'en';
    return `https://github.com/agatt1/Illumify/wiki/Help`;
}

export function getBlogPostURL(postId: string) {
    return `${BLOG_URL}${postId}/`;
}
