function hexify(number: number): string {
    return ((number < 16 ? '0' : '') + number.toString(16));
}

export function generateUID(): string {
    if ('randomUUID' in crypto) {
        const uuid = crypto.randomUUID();
        return uuid.substring(0, 8) + uuid.substring(9, 13) + uuid.substring(14, 18) + uuid.substring(19, 23) + uuid.substring(24);
    }

    return Array.from((crypto as Crypto).getRandomValues(new Uint8Array(16))).map((x) => hexify(x)).join('');
}

export function generateRandomId(): number {
    return Math.floor(Math.random() * 2 ** 55);
}
