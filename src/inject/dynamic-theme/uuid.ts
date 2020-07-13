
export function generateUID() {
    const s = window.crypto.getRandomValues(new Uint8Array(16));
    return s[0].toString(16) + s[1].toString(16) + s[2].toString(16) + s[3].toString(16) +
    s[4].toString(16) + s[5].toString(16) +
    s[6].toString(16) + s[7].toString(16) +
    s[8].toString(16) + s[9].toString(16) +
    s[10].toString(16) + s[11].toString(16) + s[12].toString(16) + s[13].toString(16) + s[14].toString(16) + s[15].toString(16);
}
