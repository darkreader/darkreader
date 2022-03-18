// Loaded with HTML/DOM only

export function multiline(...lines: string[]) {
    return lines.join('\n');
}

export function timeout(delay: number) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}
