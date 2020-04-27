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
    let pathParts = b.pathname.split('/');
    const lastPathPart = pathParts[pathParts.length - 1];
    if (lastPathPart.match(/\.[a-z]+$/i)) {
        pathParts.pop();
    }
    pathParts = pathParts.concat(...$relative.split('/')).filter((p) => p);
    let backwardIndex: number;
    while ((backwardIndex = pathParts.indexOf('..')) > 0) {
        pathParts.splice(backwardIndex - 1, 2);
    }
    const u = parseURL(`${b.protocol}//${b.host}/${pathParts.join('/')}`);
    return u.href;
}
