import type {UserSettings} from '../definitions';
import {isInPattern, isMatch} from './matching';
import {isThunderbird} from './platform';

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
    const key = `${$url}${$base ? `;${ $base}` : ''}`;
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
    if ($relative.match(/^data\\?\:/)) {
        return $relative;
    }
    // Check if relative starts with `//hostname...`.
    // We have to add a protocol to make it absolute.
    if (/^\/\//.test($relative)) {
        return `${location.protocol}${$relative}`;
    }
    const b = parseURL($base);
    const a = parseURL($relative, b.href);
    return a.href;
}

// Check if any relative URL is on the window.location;
// So that https://duck.com/ext.css would return true on https://duck.com/
// But https://duck.com/styles/ext.css would return false on https://duck.com/
// Visa versa https://duck.com/ext.css should return fasle on https://duck.com/search/
// We're checking if any relative value within ext.css could potentially not be on the same path.
export function isRelativeHrefOnAbsolutePath(href: string): boolean {
    if (href.startsWith('data:')) {
        return true;
    }
    const url = parseURL(href);
    const base = parseURL(location.href);
    if (url.protocol !== base.protocol) {
        return false;
    }
    if (url.hostname !== base.hostname) {
        return false;
    }
    if (url.port !== base.port) {
        return false;
    }
    // Now check if the path is on the same path as the base
    // We do this by getting the pathname up until the last slash.
    const path = /.*\//.exec(url.pathname)[0];
    const basePath = /.*\//.exec(base.pathname)[0];
    return path === basePath;
}

export function getURLHostOrProtocol($url: string) {
    const url = new URL($url);
    if (url.host) {
        return url.host;
    }
    return url.protocol;
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
        if (
            (url.match(/(wikipedia|wikimedia).org/i) && url.match(/(wikipedia|wikimedia)\.org\/.*\/[a-z]+\:[^\:\/]+\.pdf/i)) ||
            (url.match(/timetravel\.mementoweb\.org\/reconstruct/i) && url.match(/\.pdf$/i))
        ) {
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

export function isURLEnabled(url: string, userSettings: UserSettings, {isProtected, isInDarkList}: {isProtected: boolean; isInDarkList: boolean}) {
    if (isProtected && !userSettings.enableForProtectedPages) {
        return false;
    }
    // Only URL's with emails are getting here on thunderbird
    // So we can skip the checks and just return true.
    if (isThunderbird) {
        return true;
    }
    if (isPDF(url)) {
        return userSettings.enableForPDF;
    }
    const isURLInUserList = isURLInList(url, userSettings.siteList);
    const isURLInEnabledList = isURLInList(url, userSettings.siteListEnabled);

    if (userSettings.applyToListedOnly && !isURLInEnabledList) {
        return isURLInUserList;
    }

    if (isURLInEnabledList && isInDarkList) {
        return true;
    }
    return (!isInDarkList && !isURLInUserList);
}

export function isFullyQualifiedDomain(candidate: string) {
    return /^[a-z0-9.-]+$/.test(candidate);
}
