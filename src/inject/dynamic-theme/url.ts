import {getMatches} from '../../utils/text';

export function parseURL(url: string) {
    const a = document.createElement('a');
    a.href = url;
    return a;
}

export function getAbsoluteURL($base: string, $relative: string) {
    if ($relative.match(/^.*?\/\//) || $relative.match(/^data\:/)) {
        if ($relative.startsWith('//')) {
            return `${location.protocol}${$relative}`;
        }
        return $relative;
    }
    const relativePath = $relative.replace(/^\//, '');
    const baseParts = $base.split('/');
    const backwards = getMatches(/\.\.\//g, relativePath);
    const u = parseURL(`${baseParts.slice(0, baseParts.length - backwards.length).join('/')}/${relativePath.replace(/^(\.\.\/)*/, '')}`);
    return u.href;
}
