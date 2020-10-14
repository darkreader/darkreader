export function isIPV6(url: string) {
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

export function compareIPV6(firstURL: string, secondURL: string) {
    const firstHost = firstURL.match(ipV6HostRegex)[0];
    const secondHost = secondURL.match(ipV6HostRegex)[0];
    return firstHost === secondHost;
}
