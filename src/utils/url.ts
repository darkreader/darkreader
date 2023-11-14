import type {UserSettings, TabInfo} from '../definitions';
import {isIPV6, compareIPV6} from './ipv6';

declare const __THUNDERBIRD__: boolean;

let anchor: HTMLAnchorElement;

export const parsedURLCache = new Map<string, URL>();

function fixBaseURL($url: string): string {
    if (!anchor) {
        anchor = document.createElement('a');
    }
    anchor.href = $url;
    return anchor.href;
}

export function parseURL($url: string, $base: string | null = null): URL {
    const key = `${$url}${$base ? `;${$base}` : ''}`;
    if (parsedURLCache.has(key)) {
        return parsedURLCache.get(key)!;
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

export function getAbsoluteURL($base: string, $relative: string): string {
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

    if (url.protocol !== location.protocol) {
        return false;
    }
    if (url.hostname !== location.hostname) {
        return false;
    }
    if (url.port !== location.port) {
        return false;
    }
    // Now check if the path is on the same path as the base
    // We do this by getting the pathname up until the last slash.
    return url.pathname === location.pathname;
}

export function getURLHostOrProtocol($url: string): string {
    const url = new URL($url);
    if (url.host) {
        return url.host;
    } else if (url.protocol === 'file:') {
        return url.pathname;
    }
    return url.protocol;
}

export function compareURLPatterns(a: string, b: string): number {
    return a.localeCompare(b);
}

/**
 * Determines whether URL has a match in URL template list.
 * @param url Site URL.
 * @paramlist List to search into.
 */
export function isURLInList(url: string, list: string[]): boolean {
    for (let i = 0; i < list.length; i++) {
        if (isURLMatched(url, list[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Determines whether URL matches the template.
 * @param url URL.
 * @param urlTemplate URL template ("google.*", "youtube.com" etc).
 */
export function isURLMatched(url: string, urlTemplate: string): boolean {
    const isFirstIPV6 = isIPV6(url);
    const isSecondIPV6 = isIPV6(urlTemplate);
    if (isFirstIPV6 && isSecondIPV6) {
        return compareIPV6(url, urlTemplate);
    } else if (!isFirstIPV6 && !isSecondIPV6) {
        let regex: RegExp;
        try {
            regex = createCachedURLRegex(urlTemplate);
        } catch (e) {
            return false;
        }
        return Boolean(url.match(regex));
    }
    return false;
}

const URL_MATCH_CACHE_SIZE = 32 * 1024;
const urlMatchCache = new Map<string, RegExp>();

function createCachedURLRegex(urlTemplate: string): RegExp {
    if (urlMatchCache.has(urlTemplate)) {
        return urlMatchCache.get(urlTemplate)!;
    }

    const regex = createURLRegex(urlTemplate);
    urlMatchCache.set(urlTemplate, regex);
    if (urlMatchCache.size > URL_MATCH_CACHE_SIZE) {
        const first = urlMatchCache.keys().next().value;
        urlMatchCache.delete(first);
    }
    return regex;
}

function createURLRegex(urlTemplate: string): RegExp {
    urlTemplate = urlTemplate.trim();
    const exactBeginning = (urlTemplate[0] === '^');
    const exactEnding = (urlTemplate[urlTemplate.length - 1] === '$');
    const hasLastSlash = /\/\$?$/.test(urlTemplate);

    urlTemplate = (urlTemplate
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );

    let slashIndex: number;
    let beforeSlash: string;
    let afterSlash: string | undefined;
    if ((slashIndex = urlTemplate.indexOf('/')) >= 0) {
        beforeSlash = urlTemplate.substring(0, slashIndex); // google.*
        afterSlash = urlTemplate.replace(/\$/g, '').substring(slashIndex); // /login/abc
    } else {
        beforeSlash = urlTemplate.replace(/\$/g, '');
    }

    //
    // SCHEME and SUBDOMAINS

    let result = (exactBeginning ?
        '^(.*?\\:\\/{2,3})?' // Scheme
        : '^(.*?\\:\\/{2,3})?([^\/]*?\\.)?' // Scheme and subdomains
    );

    //
    // HOST and PORT

    const hostParts = beforeSlash.split('.');
    result += '(';
    for (let i = 0; i < hostParts.length; i++) {
        if (hostParts[i] === '*') {
            hostParts[i] = '[^\\.\\/]+?';
        }
    }
    result += hostParts.join('\\.');
    result += ')';

    //
    // PATH and QUERY

    if (afterSlash) {
        result += '(';
        result += afterSlash.replace('/', '\\/');
        result += ')';
    }

    result += (exactEnding ?
        '(\\/?(\\?[^\/]*?)?)$' // All following queries
        : `(\\/${hasLastSlash ? '' : '?'}.*?)$` // All following paths and queries
    );

    //
    // Result

    return new RegExp(result, 'i');
}

export function isPDF(url: string): boolean {
    try {
        const {hostname, pathname} = new URL(url);
        if (pathname.includes('.pdf')) {
            if (
                (hostname.match(/(wikipedia|wikimedia)\.org$/i) && pathname.match(/^\/.*\/[a-z]+\:[^\:\/]+\.pdf/i)) ||
                (hostname.match(/timetravel\.mementoweb\.org$/i) && pathname.match(/^\/reconstruct/i) && pathname.match(/\.pdf$/i)) ||
                (hostname.match(/dropbox\.com$/i) && pathname.match(/^\/s\//i) && pathname.match(/\.pdf$/i))
            ) {
                return false;
            }
            if (pathname.endsWith('.pdf')) {
                for (let i = pathname.length; i >= 0; i--) {
                    if (pathname[i] === '=') {
                        return false;
                    } else if (pathname[i] === '/') {
                        return true;
                    }
                }
            } else {
                return false;
            }
        }
    } catch (e) {
        // Do nothing
    }
    return false;
}

export function isURLEnabled(url: string, userSettings: UserSettings, {isProtected, isInDarkList, isDarkThemeDetected}: Partial<TabInfo>, isAllowedFileSchemeAccess = true): boolean {
    if (isLocalFile(url) && !isAllowedFileSchemeAccess) {
        return false;
    }
    if (isProtected && !userSettings.enableForProtectedPages) {
        return false;
    }
    // Only URL's with emails are getting here on thunderbird
    // So we can skip the checks and just return true.
    if (__THUNDERBIRD__) {
        return true;
    }
    if (isPDF(url)) {
        return userSettings.enableForPDF;
    }
    const isURLInUserList = isURLInList(url, userSettings.siteList);
    const isURLInEnabledList = isURLInList(url, userSettings.siteListEnabled);

    if (userSettings.applyToListedOnly) {
        return isURLInEnabledList || isURLInUserList;
    }
    if (isURLInEnabledList) {
        return true;
    }
    if (isInDarkList || (userSettings.detectDarkTheme && isDarkThemeDetected)) {
        return false;
    }
    return !isURLInUserList;
}

export function isFullyQualifiedDomain(candidate: string): boolean {
    return /^[a-z0-9\.\-]+$/i.test(candidate) && candidate.indexOf('..') === -1;
}

export function isFullyQualifiedDomainWildcard(candidate: string): boolean {
    if (!candidate.includes('*') || !/^[a-z0-9\.\-\*]+$/i.test(candidate)) {
        return false;
    }
    const labels = candidate.split('.');
    for (const label of labels) {
        if (label !== '*' && !/^[a-z0-9\-]+$/i.test(label)) {
            return false;
        }
    }
    return true;
}

export function fullyQualifiedDomainMatchesWildcard(wildcard: string, candidate: string): boolean {
    const wildcardLabels = wildcard.toLowerCase().split('.');
    const candidateLabels = candidate.toLowerCase().split('.');
    if (candidateLabels.length < wildcardLabels.length) {
        return false;
    }
    while (wildcardLabels.length) {
        const wildcardLabel = wildcardLabels.pop();
        const candidateLabel = candidateLabels.pop();
        if (wildcardLabel !== '*' && wildcardLabel !== candidateLabel) {
            return false;
        }
    }
    return true;
}

export function isLocalFile(url: string): boolean {
    return Boolean(url) && url.startsWith('file:///');
}
