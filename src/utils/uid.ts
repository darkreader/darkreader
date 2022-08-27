function hexify(number: number) {
    return ((number < 16 ? '0' : '') + number.toString(16));
}

export function generateUID() {
    if ('randomUUID' in crypto) {
        const uuid = crypto.randomUUID();
        return uuid.substring(0, 8) + uuid.substring(9, 13) + uuid.substring(14, 18) + uuid.substring(19, 23) + uuid.substring(24);
    }

    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((x) => hexify(x)).join('');
}
