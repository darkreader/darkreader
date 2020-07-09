export function parseURL($url: string) {
    if ($url.startsWith('//')) {
        $url = `${location.protocol}${$url}`;
    }
    return new URL($url);
}

export function getAbsoluteURL($base: string, $relative: string) {
    if ($relative.match(/^data\:/)) {
        return $relative;
    }

    if ($relative.match(/^.*?\/\//)) {
        return parseURL($relative).href;
    }

    const b = parseURL($base);
    if ($relative.startsWith('/')) {
        return parseURL(`${b.origin}${$relative}`).href;
    }

    const basePath = b.pathname.replace(/\/[^\/]+\.[a-z]+$/i, '');
    const fullPath = `${basePath}${b.pathname.endsWith('/') ? '' : '/'}${$relative}`;
    return parseURL(`${b.origin}${fullPath}`).href;
}
