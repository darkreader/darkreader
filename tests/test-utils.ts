export function multiline(...lines: Array<string>) {
    return lines.join('\n');
}

export function timeout(delay: number) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}
