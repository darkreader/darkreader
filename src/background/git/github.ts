function getDiffURL(patchId: number): string {
    return `https://patch-diff.githubusercontent.com/raw/darkreader/darkreader/pull/${patchId}.diff`;
}

function getPatchURL(patchId: number): string {
    return `https://patch-diff.githubusercontent.com/raw/darkreader/darkreader/pull/${patchId}.patch`;
}

function getPatchIdFromGitHubURL(url: string): number | null {
    const prefix = 'https://github.com/darkreader/darkreader/pull/';
    if (url.startsWith(prefix)) {
        const numberString = url.substring(prefix.length);
        const number = Number(numberString);
        if (Number.isInteger(number)) {
            return number;
        }
    }
    return null;
}