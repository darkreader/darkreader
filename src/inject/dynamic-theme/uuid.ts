// `hex` variable contain all available hex values into array.
function hexify(number: Number) {
    return number < 16 ? "0" + number.toString(16) : number.toString(16);
}
// Secure & Fast UUID generator implementation of https://tools.ietf.org/html/rfc4122 version 4.
export function generateUUID() {
    // Using crypto.getRandomValues for security and managed by the OS itself.
    // Using Uint8Array to compile with the max hex value of 255
    const s = window.crypto.getRandomValues(new Uint8Array(16));
    return hexify(s[0]) + hexify(s[1]) + hexify(s[2]) + hexify(s[3]) + '-' +
    hexify(s[4]) + hexify(s[5]) + '-' +
    hexify(s[6]) + hexify(s[7]) + '-' +
    hexify(s[8]) + hexify(s[9]) + '-' +
    hexify(s[10]) + hexify(s[11]) + hexify(s[12]) + hexify(s[13]) + hexify(s[14]) + hexify(s[15]);
}
