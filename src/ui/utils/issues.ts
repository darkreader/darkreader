export function isAffectedByChromiumIssue750419() {
    const agent = navigator.userAgent.toLowerCase();
    const m = agent.match(/chrom[e|ium]\/([^ ]+)/);
    if (m && m[1]) {
        const chromeVersion = m[1];
        const isWindows = navigator.platform.toLowerCase().indexOf('win') === 0;
        const isVivaldi = agent.indexOf('vivaldi') >= 0;
        const isYaBrowser = agent.indexOf('yabrowser') >= 0;
        const isOpera = agent.indexOf('opr') >= 0 || agent.indexOf('opera') >= 0;
        if (chromeVersion > '62.0.3167.0' && isWindows && !isVivaldi && !isYaBrowser && !isOpera) {
            return true;
        }
    }
    return false;
}
