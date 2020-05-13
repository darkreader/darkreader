/**
 * Compares if IPV6 addresses are the same.
 *
 * @param {string} orignalIp
 * @param {string} compareIp
 */
export function compareIPV6(orignalIp: string, compareIp: string) {
    const orignalIp2 = (orignalIp
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );
    const ip = compareIp.toLowerCase();
    const ip2 = orignalIp2.toLowerCase();
    return ip === ip2;
}

