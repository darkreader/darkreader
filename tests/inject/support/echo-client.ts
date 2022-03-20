export function getEchoURL(content: string, type = 'text/plain') {
    return `${window.location.origin}/echo?${new URLSearchParams({type, content})}`;
}

export function getCSSEchoURL(content: string) {
    return getEchoURL(content, 'text/css');
}
