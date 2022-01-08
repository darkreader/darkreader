// @ts-check
import {isIPV6, compareIPV6} from './ipv6';
import {isThunderbird} from './platform';

/** @typedef {import('../definitions').UserSettings} UserSettings */

/** @type {HTMLAnchorElement} */
let anchor;

/** @type {Map<string, URL>} */
export const parsedURLCache = new Map();

function fixBaseURL(/** @type {string} */$url) {
    if (!anchor) {
        anchor = document.createElement('a');
    }
    anchor.href = $url;
    return anchor.href;
}

/**
 * @param {string} $url
 * @param {string} [$base]
 * @returns {URL}
 */
export function parseURL($url, $base = null) {
    const key = `${$url}${$base ? `;${$base}` : ''}`;
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

/**
 * @param {string} $base
 * @param {string} $relative
 * @returns {string}
 */
export function getAbsoluteURL($base, $relative) {
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
/**
 * @param {string} href
 * @returns {boolean}
 */
export function isRelativeHrefOnAbsolutePath(href) {
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

/**
 * @param {string} $url
 * @returns {string}
 */
export function getURLHostOrProtocol($url) {
    const url = new URL($url);
    if (url.host) {
        return url.host;
    } else if (url.protocol === 'file:') {
        return url.pathname;
    }
    return url.protocol;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareURLPatterns(a, b) {
    return a.localeCompare(b);
}

/**
 * Determines whether URL has a match in URL template list.
 * @param {string} url Site URL.
 * @param {string[]} list List to search into.
 * @returns {boolean}
 */
export function isURLInList(url, list) {
    for (let i = 0; i < list.length; i++) {
        if (isURLMatched(url, list[i])) {
            return true;
        }
    }
    return false;
}

/**
 * Determines whether URL matches the template.
 * @param {string} url URL.
 * @param {string} urlTemplate URL template ("google.*", "youtube.com" etc).
 * @returns {boolean}
 */
export function isURLMatched(url, urlTemplate) {
    const isFirstIPV6 = isIPV6(url);
    const isSecondIPV6 = isIPV6(urlTemplate);
    if (isFirstIPV6 && isSecondIPV6) {
        return compareIPV6(url, urlTemplate);
    } else if (!isFirstIPV6 && !isSecondIPV6) {
        const regex = createUrlRegex(urlTemplate);
        return Boolean(url.match(regex));
    }
    return false;
}

/**
 * @param {string} urlTemplate
 * @returns {RegExp}
 */
function createUrlRegex(urlTemplate) {
    urlTemplate = urlTemplate.trim();
    const exactBeginning = (urlTemplate[0] === '^');
    const exactEnding = (urlTemplate[urlTemplate.length - 1] === '$');

    urlTemplate = (urlTemplate
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );

    /** @type {number} */
    let slashIndex;
    /** @type {string} */
    let beforeSlash;
    /** @type {string} */
    let afterSlash;
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
        : '(\\/?.*?)$' // All following paths and queries
    );

    //
    // Result

    return new RegExp(result, 'i');
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isPDF(url) {
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

/**
 * @param {string} url
 * @param {UserSettings} userSettings
 * @param {{isProtected: boolean; isInDarkList: boolean}} urlInfo
 * @returns {boolean}
 */
export function isURLEnabled(url, userSettings, {isProtected, isInDarkList}) {
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

/**
 * @param {string} candidate
 * @returns {boolean}
 */
export function isFullyQualifiedDomain(candidate) {
    return /^[a-z0-9.-]+$/.test(candidate);
}
