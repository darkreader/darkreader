export function isFirefox() {
    return navigator.userAgent.indexOf('Firefox') >= 0;
}

export function isVivaldi() {
    return navigator.userAgent.toLowerCase().indexOf('vivaldi') >= 0;
}

export function isYaBrowser() {
    return navigator.userAgent.toLowerCase().indexOf('yabrowser') >= 0;
}

export function isOpera() {
    const agent = navigator.userAgent.toLowerCase();
    return agent.indexOf('opr') >= 0 || agent.indexOf('opera') >= 0;
}

export function isWindows() {
    return navigator.platform.toLowerCase().indexOf('win') === 0;
}

export function isMacOS() {
    return navigator.platform.toLowerCase().indexOf('mac') === 0;
}

export function getChromeVersion() {
    const agent = navigator.userAgent.toLowerCase();
    const m = agent.match(/chrom[e|ium]\/([^ ]+)/);
    if (m && m[1]) {
        return m[1];
    }
    return null;
}

export function compareChromeVersions($a: string, $b: string) {
    const a = $a.split('.').map((x) => parseInt(x));
    const b = $b.split('.').map((x) => parseInt(x));
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return a[i] < b[i] ? -1 : 1;
        }
    }
    return 0;
}
