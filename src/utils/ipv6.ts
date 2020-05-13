/**
 * Compares if IPV6 addresses are the same.
 * @param firstIp First IP to compare with
 * @param secondIp Second IP to compare with
 */
export function CompareIPV6(firstIp: string, secondIp: string) {
    firstIp = (firstIp
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );
    const ip = secondIp.toLowerCase();
    const ip2 = firstIp.toLowerCase();
    return ip === ip2;
}
