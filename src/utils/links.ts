export const GITHUB_URL = 'https://github.com/ImFromKazakstan/darkreader';
export const HOMEPAGE_URL = GITHUB_URL;
export const BLOG_URL = `${GITHUB_URL}/releases/`;
export const NEWS_URL = 'https://raw.githubusercontent.com/ImFromKazakstan/darkreader/main/src/config/posts.json';
export const DEVTOOLS_DOCS_URL = `${GITHUB_URL}/blob/main/CONTRIBUTING.md`;
export const DONATE_URL = 'https://github.com/catppuccin/catppuccin#-sponsors';
export const MOBILE_URL = `${GITHUB_URL}#readme`;
export const PRIVACY_URL = `${GITHUB_URL}/blob/main/SECURITY.md`;
export const TWITTER_URL = 'https://github.com/catppuccin';
export const UNINSTALL_URL = `${GITHUB_URL}/issues`;
export const HELP_URL = `${GITHUB_URL}#readme`;
export const CONFIG_URL_BASE = 'https://raw.githubusercontent.com/ImFromKazakstan/darkreader/main/src/config';

export function getHelpURL(): string {
    return HELP_URL;
}

export function getBlogPostURL(postId: string): string {
    return `${BLOG_URL}${postId}`;
}
