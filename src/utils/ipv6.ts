/**
 * Compares if IPV6 addresses are the same.
 * @param FirstIp First IP to compare with
 * @param SecondIp Second IP to compare with
 */
export function compareIPV6(FirstIp: string, SecondIp: string) {
    FirstIp = (FirstIp
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );
    const ip = SecondIp.toLowerCase();
    const ip2 = FirstIp.toLowerCase();
    return ip === ip2;
}
