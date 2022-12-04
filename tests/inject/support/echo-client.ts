export function getEchoURL(content: string, type = 'text/plain') {
    return `http://localhost:9966/echo?${new URLSearchParams({type, content})}`;
}

export function getCSSEchoURL(content: string) {
    return getEchoURL(content, 'text/css');
}

export function getJSEchoURL(script: string) {
    return getEchoURL(script, 'application/javascript');
}
