import type {UserSettings} from '../definitions';
import {isInPattern, isMatch} from './matching';

let anchor: HTMLAnchorElement;

export const parsedURLCache = new Map<string, URL>();

function fixBaseURL($url: string) {
    if (!anchor) {
        anchor = document.createElement('a');
    }
    anchor.href = $url;
    return anchor.href;
}

export function parseURL($url: string, $base: string = null) {
    const key = `${$url}${$base ? ';' + $base : ''}`;
    if (parsedURLCache.has(key)) {
        return parsedURLCache.get(key);
    }
    if ($base) {
        const parsedURL = new URL($url, fixBaseURL($base));
        parsedURLCache.set(key, parsedURL);
        return parsedURL;
    }
    const parsedURL = new URL(fixBaseURL($url));
    parsedURLCache.set($url, parsedURL);
    return parsedURL;
}

export function getAbsoluteURL($base: string, $relative: string) {
    if ($relative.match(/^data\:/)) {
        return $relative;
    }

    const b = parseURL($base);
    const a = parseURL($relative, b.href);
    return a.href;
}

export function getURLHostOrProtocol($url: string) {
    const url = new URL($url);
    if (url.host) {
        return url.host;
    } else {
        return url.protocol;
    }
}

export function compareURLPatterns(a: string, b: string) {
    return a.localeCompare(b);
}

/**
 * Determines whether URL has a match in URL template list.
 * @param url Site URL.
 * @paramlist List to search into.
 */
export function isURLInList(url: string, list: string[]) {
    return isInPattern(url, list);
}

/**
 * Determines whether URL matches the template.
 * @param url URL.
 * @param urlTemplate URL template ("google.*", "youtube.com" etc).
 */
export function isURLMatched(url: string, urlTemplate: string): boolean {
    return isMatch(url, urlTemplate);
}

export function isPDF(url: string) {
    if (url.includes('.pdf')) {
        if (url.includes('?')) {
            url = url.substring(0, url.lastIndexOf('?'));
        }
        if (url.includes('#')) {
            url = url.substring(0, url.lastIndexOf('#'));
        }
        if (url.match(/(wikipedia|wikimedia).org/i) && url.match(/(wikipedia|wikimedia)\.org\/.*\/[a-z]+\:[^\:\/]+\.pdf/i)) {
            return false;
        }
        if (url.endsWith('.pdf')) {
            for (let i = url.length; i > 0; i--) {
                if (url[i] === '=') {
                    return false;
                } else if (url[i] === '/') {
                    return true;
                }
            }
        } else {
            return false;
        }
    }
    return false;
}

export function isURLEnabled(url: string, userSettings: UserSettings, {isProtected, isInDarkList}) {
    if (isProtected && !userSettings.enableForProtectedPages) {
        return false;
    }
    if (isPDF(url)) {
        return userSettings.enableForPDF;
    }
    const isURLInUserList = isURLInList(url, userSettings.siteList);
    if (userSettings.applyToListedOnly) {
        return isURLInUserList;
    }
    // TODO: Use `siteListEnabled`, `siteListDisabled`, `enabledByDefault` options.
    // Delete `siteList` and `applyToListedOnly` options, transfer user's values.
    const isURLInEnabledList = isURLInList(url, userSettings.siteListEnabled);
    if (isURLInEnabledList && isInDarkList) {
        return true;
    }
    return (!isInDarkList && !isURLInUserList);
}
