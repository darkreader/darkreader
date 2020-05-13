/**
 * Compares if IPV6 addresses are the same.
 * @param firstIP First IP to compare with
 * @param secondIP Second IP to compare with
 */
export function compareIPV6(firstIP: string, secondIP: string) {
    firstIP = (firstIP
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );
    const ip = secondIP.toLowerCase();
    const ip2 = firstIP.toLowerCase();
    return ip === ip2;
}
