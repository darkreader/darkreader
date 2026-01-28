import type {UserSettings, TabInfo} from '../definitions';

import {cachedFactory} from './cache';

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
    if (isRegExp(urlTemplate)) {
        const regexp = createRegExp(urlTemplate);
        return regexp ? regexp.test(url) : false;
    }
    return matchURLPattern(url, urlTemplate);
}

const URL_CACHE_SIZE = 32;
const prepareURL = cachedFactory((url: string) => {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch (err) {
        return null;
    }
    const {hostname, pathname, protocol, port} = parsed;
    const hostParts = hostname.split('.').reverse();
    const pathParts = pathname.split('/').slice(1);
    if (!pathParts[pathParts.length - 1]) {
        pathParts.splice(pathParts.length - 1, 1);
    }
    return {
        hostParts,
        pathParts,
        port,
        protocol,
    };
}, URL_CACHE_SIZE);

const URL_MATCH_CACHE_SIZE = 32 * 1024;
const preparePattern = cachedFactory((pattern: string) => {
    if (!pattern) {
        return null;
    }

    const exactStart = pattern.startsWith('^');
    const exactEnd = pattern.endsWith('$');
    if (exactStart) {
        pattern = pattern.substring(1);
    }
    if (exactEnd) {
        pattern = pattern.substring(0, pattern.length - 1);
    }

    let protocol = '';
    const protocolIndex = pattern.indexOf('://');
    if (protocolIndex > 0) {
        protocol = pattern.substring(0, protocolIndex + 1);
        pattern = pattern.substring(protocolIndex + 3);
    }

    const slashIndex = pattern.indexOf('/');
    const host = slashIndex < 0 ? pattern : pattern.substring(0, slashIndex);

    let hostName = host;

    let isIPv6 = false;
    let ipV6End = -1;
    if (host.startsWith('[')) {
        ipV6End = host.indexOf(']');
        if (ipV6End > 0) {
            isIPv6 = true;
        }
    }

    let port = '*';
    const portIndex = host.lastIndexOf(':');
    if (portIndex >= 0 && (!isIPv6 || ipV6End < portIndex)) {
        hostName = host.substring(0, portIndex);
        port = host.substring(portIndex + 1);
    }

    if (isIPv6) {
        try {
            const ipV6URL = new URL(`http://${hostName}`);
            hostName = ipV6URL.hostname;
        } catch (err) {
        }
    }

    const hostParts = hostName.split('.').reverse();

    const path = slashIndex < 0 ? '' : pattern.substring(slashIndex + 1);
    const pathParts = path.split('/');
    if (!pathParts[pathParts.length - 1]) {
        pathParts.splice(pathParts.length - 1, 1);
    }

    return {
        hostParts,
        pathParts,
        port,
        exactStart,
        exactEnd,
        protocol,
    };
}, URL_MATCH_CACHE_SIZE);

function matchURLPattern(url: string, pattern: string) {
    const u = prepareURL(url);
    const p = preparePattern(pattern);

    if (
        !(u && p)
        || (p.hostParts.length > u.hostParts.length)
        || (p.exactStart && p.hostParts.length !== u.hostParts.length)
        || (p.exactEnd && p.pathParts.length !== u.pathParts.length)
        || (p.port !== '*' && p.port !== u.port)
        || (p.protocol && p.protocol !== u.protocol)
    ) {
        return false;
    }

    for (let i = 0; i < p.hostParts.length; i++) {
        const pHostPart = p.hostParts[i];
        const uHostPart = u.hostParts[i];
        if (pHostPart !== '*' && pHostPart !== uHostPart) {
            return false;
        }
    }

    if (
        p.hostParts.length >= 2
        && p.hostParts.at(-1) !== '*'
        && (
            p.hostParts.length < u.hostParts.length - 1
            || (
                p.hostParts.length === u.hostParts.length - 1
                && u.hostParts.at(-1) !== 'www'
            )
        )
    ) {
        return false;
    }

    if (p.pathParts.length === 0) {
        return true;
    }

    if (p.pathParts.length > u.pathParts.length) {
        return false;
    }

    for (let i = 0; i < p.pathParts.length; i++) {
        const pPathPart = p.pathParts[i];
        const uPathPart = u.pathParts[i];
        if (pPathPart !== '*' && pPathPart !== uPathPart) {
            return false;
        }
    }

    return true;
}

function isRegExp(pattern: string) {
    return pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2;
}

const REGEXP_CACHE_SIZE = 1024;
const createRegExp = cachedFactory((pattern: string) => {
    if (pattern.startsWith('/')) {
        pattern = pattern.substring(1);
    }
    if (pattern.endsWith('/')) {
        pattern = pattern.substring(0, pattern.length - 1);
    }
    try {
        return new RegExp(pattern);
    } catch (err) {
        return null;
    }
}, REGEXP_CACHE_SIZE);

const wikiPDFPathRegexp = /^\/.*\/[a-z]+\:[^\:\/]+\.pdf/i;

export function isPDF(url: string): boolean {
    try {
        const {hostname, pathname} = new URL(url);
        if (pathname.includes('.pdf')) {
            if (
                ((hostname.endsWith('.wikipedia.org') || hostname.endsWith('.wikipedia.org')) && pathname.match(wikiPDFPathRegexp)) ||
                (hostname.endsWith('.dropbox.com') && pathname.startsWith('/s/') && (pathname.endsWith('.pdf') || pathname.endsWith('.PDF')))
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
    const isURLInDisabledList = isURLInList(url, userSettings.disabledFor);
    const isURLInEnabledList = isURLInList(url, userSettings.enabledFor);

    if (!userSettings.enabledByDefault) {
        return isURLInEnabledList;
    }
    if (isURLInEnabledList) {
        return true;
    }
    if (isInDarkList || (userSettings.detectDarkTheme && isDarkThemeDetected)) {
        return false;
    }
    return !isURLInDisabledList;
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
