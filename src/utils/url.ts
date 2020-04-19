import {UserSettings} from '../definitions';

export function getURLHost(url: string) {
    return url.match(/^(.*?\/{2,3})?(.+?)(\/|$)/)[2];
}

export function compareURLPatterns(a: string, b: string) {
    return a.localeCompare(b);
}

export function shouldBeReverse(url: string, list: string[], index: number) {
    var listurl = list[index];
    if (listurl.startsWith('!')) {
        var regex =  /(?:http[s]*\:\/\/)*(.*?)\.(?=[^\/]*\..{2,5})/i
        listurl = listurl.replace(/^\!/, '');
        url = (url
            .replace(/^\^/, '') // Remove ^ at start
            .replace(/^\!/, '') // Remove ! at start
            .replace(/\$$/, '') // Remove $ at end
            .replace(/^.*?\/{2,3}/, '') // Remove scheme
            .replace(/\?.*$/, '') // Remove query
            .replace(/\/$/, '') // Remove last slash
        );
        if (listurl.startsWith("*")) {
            if (url.startsWith('www')) {
                return true;
            }
            if (url.match(regex)) {
                return false;
            }else {
                return true;
            }
        }
        if (listurl.match(regex)) {
            if (regex.exec(listurl)[0] == regex.exec(url)[0]) {
                return true;
            }else {
                return false;
            }
        }else {
            return true;
        }
    }
    return false;
}

/**
 * Determines whether URL has a match in URL template list.
 * @param url Site URL.
 * @paramlist List to search into.
 */
export function isURLInList(url: string, list: string[]) {
    for (let i = 0; i < list.length; i++) {
        if (isURLMatched(url, list[i])) {
            if (shouldBeReverse(url, list, i)) { //Checks if the original url in the config has negative !
                return false;
            }
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
    const regex = createUrlRegex(urlTemplate);
    return Boolean(url.match(regex));
}

function createUrlRegex(urlTemplate: string): RegExp {
    urlTemplate = urlTemplate.trim();
    const exactBeginning = (urlTemplate[0] === '^');
    const exactEnding = (urlTemplate[urlTemplate.length - 1] === '$');

    urlTemplate = (urlTemplate
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/^\!/, '') // Remove ! at start
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

export function isURLEnabled(url: string, userSettings: UserSettings, {isProtected, isInDarkList}) {
    if (isProtected) {
        return false;
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
