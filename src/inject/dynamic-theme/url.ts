function fixBaseURL($url: string) {
    const a = document.createElement('a');
    a.href = $url;
    return a.href;
}

export function parseURL($url: string, $base: string = null) {
    if ($base) {
        $base = fixBaseURL($base);
        return new URL($url, $base);
    }
    $url = fixBaseURL($url);
    return new URL($url);
}

export function getAbsoluteURL($base: string, $relative: string) {
    if ($relative.match(/^data\:/)) {
        return $relative;
    }

    const b = parseURL($base);
    const a = parseURL($relative, b.href);
    return a.href;
}
