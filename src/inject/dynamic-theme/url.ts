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
    const b = parseURL($base);
    if ($relative.startsWith('/')) {
        const u = parseURL(`${b.protocol}//${b.host}${$relative}`);
        return u.href;
    }
    const baseParts = b.pathname.split('/');
    const backwards = getMatches(/\.\.\//g, $relative);
    const u = parseURL(`${b.protocol}//${b.host}${baseParts.slice(0, baseParts.length - backwards.length).join('/')}/${$relative.replace(/^(\.\.\/)*/, '')}`);
    return u.href;
}
