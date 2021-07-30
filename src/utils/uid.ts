function hexify(number: number) {
    return ((number < 16 ? '0' : '') + number.toString(16));
}

export function generateUID() {
    // TODO: remove any cast once types are updated
    if ((crypto as any).randomUUID) {
        return (crypto as any).randomUUID().replaceAll('-', ' ');
    }

    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((x) => hexify(x)).join('');
}
