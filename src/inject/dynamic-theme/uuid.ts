// `hex` variable contain all available hex values into array.
const hex = []; 
for (let i=0; i < 256; i++) { 
    hex[i] = (i < 16 ? '0' : '') + (i).toString(16); 
}

// Secure & Fast UUID generator implementation of https://tools.ietf.org/html/rfc4122 version 4.
export function generateUUID() {
    // Using crypto.getRandomValues for security and managed by the OS itself.
    // Using Uint32Array to get best variety of numbers posible while 32-Bit comptabile.
    // Notes are for the reviewer(Alexander) to understand what is happening You can remove this If you get what this does :)
    const secure = window.crypto.getRandomValues(new Uint32Array(4))
    const d0 = secure[0];
    const d1 = secure[1];
    const d2 = secure[2];
    const d3 = secure[3];

    return hex[d0&0xff] + hex[d0>>8&0xff] + hex[d0>>16&0xff] + hex[d0>>24&0xff] + '-' +
    hex[d1&0xff] + hex[d1>>8&0xff] + '-' + 
    hex[d1>>16&0x0f|0x40] + hex [d1>>24&0xff] + '-' +
    hex[d2&0x3f|0x80] + hex[d2>>8&0xff] + '-' + 
    hex[d2>>16&0xff] + hex[d2>>24&0xff] + hex[d3&0xff] + hex[d3>>8&0xff] + hex[d3>>16&0xff] + hex[d3>>24&0xff];
}