function decompress(ipv6: string) {

    ipv6 = ipv6.replace('[', '').replace(']','');

    if (!validate(ipv6)) {
       throw new Error('Invalid address: ' + ipv6);
    }
    ipv6 = ipv6.toLowerCase()
 
    const nh = ipv6.split(/\:\:/g);
    if (nh.length > 2) {
       throw new Error('Invalid address: ' + ipv6);
    }
 
    let sections = [];
    if (nh.length == 1) {
       sections = ipv6.split(/\:/g);
       if (sections.length !== 8) {
          throw new Error('Invalid address: ' + ipv6);
       }
    } else if (nh.length == 2) {
       const n = nh[0];
       const h = nh[1];
       const ns = n.split(/\:/g);
       const hs = h.split(/\:/g);
       for (let i in ns) {
          sections[i] = ns[i];
       }
       for (let i = hs.length; i > 0; --i) {
          sections[7 - (hs.length - i)] = hs[i - 1];
       }
    }
    for (let i = 0; i < 8; ++i) {
       if (sections[i] === undefined) {
          sections[i] = '0000';
       }
       sections[i] = leftPad(sections[i], '0', 4);
    }
    return sections.join(':');
 };

function validate(ip: string) {
    return /^[a-f0-9\\:]+$/ig.test(ip);
 };
 
 function leftPad(section: string, padd: string, times: any) {
    const padding = padd.repeat(times);
    if (section.length < padding.length) {
        section = padding.substring(0, padding.length - section.length) + section;
    }
    return section;
 };

 export function matchIPV6(orignalIp: string, ipv6: string) {
    const orignalIp2 = (orignalIp
        .replace(/^\^/, '') // Remove ^ at start
        .replace(/\$$/, '') // Remove $ at end
        .replace(/^.*?\/{2,3}/, '') // Remove scheme
        .replace(/\?.*$/, '') // Remove query
        .replace(/\/$/, '') // Remove last slash
    );
    let ip = decompress(ipv6.substr(0, ipv6.indexOf(']') + 1));
    let ip2 = decompress(orignalIp2.substr(0, orignalIp2.indexOf(']') + 1));
    ip = '[' + ip + ipv6.substr(ipv6.indexOf(']'))
    ip2 = '[' + ip2 + orignalIp2.substr(orignalIp2.indexOf(']'))
    return ip === ip2;
}