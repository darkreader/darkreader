import {UserSettings} from '../definitions';
import {isIPV6, compareIPV6} from './ipv6';
import {isMobile, isFirefox} from './platform';

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
    } else if (!isSecondIPV6 && !isSecondIPV6) {
        const regex = createUrlRegex(urlTemplate);
        return Boolean(url.match(regex));
    } else {
        return false;
    }
}

function createUrlRegex(urlTemplate: string): RegExp {
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

    let slashIndex: number;
    let beforeSlash: string;
    let afterSlash: string;
    if ((slashIndex = urlTemplate.indexOf('/')) >= 0) {
        beforeSlash = urlTemplate.substring(0, slashIndex); // google.*
        afterSlash = urlTemplate.replace('$', '').substring(slashIndex); // /login/abc
    } else {
        beforeSlash = urlTemplate.replace('$', '');
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
            for (let i = url.length; 0 < i; i--) {
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
    if (isProtected) {
        return false;
    }
    if (isPDF(url) && userSettings.enableForPDF) {
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

function getExtensionPageObject(path: string): Promise<chrome.windows.Window> | Promise<chrome.tabs.Tab> {
    if (isMobile()) {
        return new Promise<chrome.tabs.Tab>((resolve) => {
            chrome.tabs.query({}, (t) => {
                for (const tab of t) {
                    if (tab.url.endsWith(path)) {
                        resolve(tab);
                        return;
                    }
                }
                resolve(null);
            });
        });
    }
    return new Promise<chrome.windows.Window>((resolve) => {
        chrome.windows.getAll({
            populate: true,
            windowTypes: ['popup']
        }, (w) => {
            for (const window of w) {
                if (window.tabs[0].url.endsWith(path)) {
                    resolve(window);
                    return;
                }
            }
            resolve(null);
        });
    });
}

export async function openExtensionPage(path: string) {
    const cssEditorObject = await getExtensionPageObject(path);
    if (isMobile()) {
        if (cssEditorObject) {
            chrome.tabs.update(cssEditorObject.id, {'active': true});
            window.close();
        } else {
            chrome.tabs.create({
                url: `../${path}`,
            });
            window.close();
        }
    } else {
        if (cssEditorObject) {
            chrome.windows.update(cssEditorObject.id, {'focused': true});
        } else {
            chrome.windows.create({
                type: 'popup',
                url: isFirefox() ? `../${path}` : `ui/${path}`,
                width: 600,
                height: 600,
            });
        }
    }
}
