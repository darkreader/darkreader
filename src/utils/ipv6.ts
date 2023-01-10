const simpleIPV6Regex = /\[[0-9:a-zA-Z]+?\]/;

export function isIPV6(url: string) {
    const openingBracketIndex = simpleIPV6Regex.exec(url);
    if (!openingBracketIndex) {
        return false;
    }
    const queryIndex = url.indexOf('?');
    if (queryIndex >= 0 && openingBracketIndex.index > queryIndex) {
        return false;
    }
    return true;
}

const ipV6HostRegex = /\[.*?\](\:\d+)?/;

export function compareIPV6(firstURL: string, secondURL: string): boolean {
    const firstHost = firstURL.match(ipV6HostRegex)![0];
    const secondHost = secondURL.match(ipV6HostRegex)![0];
    return firstHost === secondHost;
}
