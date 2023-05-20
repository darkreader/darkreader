// Loaded with HTML/DOM only

export function multiline(...lines: string[]): string {
    if (lines.length < 1) {
        return '\n';
    }
    if (lines[lines.length - 1] !== '') {
        lines.push('');
    }
    return lines.join('\n');
}

export function timeout(delay: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, delay));
}

export function waitForEvent(eventName: string): Promise<void> {
    return new Promise<void>((resolve) => {
        document.addEventListener(eventName, () => resolve(), {once: true});
    });
}
