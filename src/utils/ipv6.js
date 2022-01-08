// @ts-check
/**
 * @param {string} url
 * @returns {boolean}
 */
export function isIPV6(url) {
    const openingBracketIndex = url.indexOf('[');
    if (openingBracketIndex < 0) {
        return false;
    }
    const queryIndex = url.indexOf('?');
    if (queryIndex >= 0 && openingBracketIndex > queryIndex) {
        return false;
    }
    return true;
}

const ipV6HostRegex = /\[.*?\](\:\d+)?/;

/**
 * @param {string} firstURL
 * @param {string} secondURL
 * @returns {boolean}
 */
export function compareIPV6(firstURL, secondURL) {
    const firstHost = firstURL.match(ipV6HostRegex)[0];
    const secondHost = secondURL.match(ipV6HostRegex)[0];
    return firstHost === secondHost;
}
