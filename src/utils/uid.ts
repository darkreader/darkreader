function hexify(number: number) {
    return ((number < 16 ? '0' : '') + number.toString(16));
}

export function generateUID() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((x) => hexify(x)).join('');
}
