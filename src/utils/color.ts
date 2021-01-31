export interface RGBA {
    r: number;
    g: number;
    b: number;
    a?: number;
}

export interface HSLA {
    h: number;
    s: number;
    l: number;
    a?: number;
}

// https://en.wikipedia.org/wiki/HSL_and_HSV
export function hslToRGB({h, s, l, a = 1}: HSLA): RGBA {
    if (s === 0) {
        const [r, b, g] = [l, l, l].map((x) => Math.round(x * 255));
        return {r, g, b, a};
    }

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    const [r, g, b] = (
        h < 60 ? [c, x, 0] :
            h < 120 ? [x, c, 0] :
                h < 180 ? [0, c, x] :
                    h < 240 ? [0, x, c] :
                        h < 300 ? [x, 0, c] :
                            [c, 0, x]
    ).map((n) => Math.round((n + m) * 255));

    return {r, g, b, a};
}

// https://en.wikipedia.org/wiki/HSL_and_HSV
export function rgbToHSL({r: r255, g: g255, b: b255, a = 1}: RGBA): HSLA {
    const r = r255 / 255;
    const g = g255 / 255;
    const b = b255 / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const c = max - min;

    const l = (max + min) / 2;

    if (c === 0) {
        return {h: 0, s: 0, l, a};
    }

    let h = (
        max === r ? (((g - b) / c) % 6) :
            max === g ? ((b - r) / c + 2) :
                ((r - g) / c + 4)
    ) * 60;
    if (h < 0) {
        h += 360;
    }

    const s = c / (1 - Math.abs(2 * l - 1));

    return {h, s, l, a};
}

function toFixed(n: number, digits = 0) {
    const fixed = n.toFixed(digits);
    if (digits === 0) {
        return fixed;
    }
    const dot = fixed.indexOf('.');
    if (dot >= 0) {
        const zerosMatch = fixed.match(/0+$/);
        if (zerosMatch) {
            if (zerosMatch.index === dot + 1) {
                return fixed.substring(0, dot);
            }
            return fixed.substring(0, zerosMatch.index);
        }
    }
    return fixed;
}

export function rgbToString(rgb: RGBA) {
    const {r, g, b, a} = rgb;
    if (a != null && a < 1) {
        return `rgba(${toFixed(r)}, ${toFixed(g)}, ${toFixed(b)}, ${toFixed(a, 2)})`;
    }
    return `rgb(${toFixed(r)}, ${toFixed(g)}, ${toFixed(b)})`;
}

export function rgbToHexString({r, g, b, a}: RGBA) {
    return `#${(a != null && a < 1 ? [r, g, b, Math.round(a * 255)] : [r, g, b]).map((x) => {
        return `${x < 16 ? '0' : ''}${x.toString(16)}`;
    }).join('')}`;
}

export function hslToString(hsl: HSLA) {
    const {h, s, l, a} = hsl;
    if (a != null && a < 1) {
        return `hsla(${toFixed(h)}, ${toFixed(s * 100)}%, ${toFixed(l * 100)}%, ${toFixed(a, 2)})`;
    }
    return `hsl(${toFixed(h)}, ${toFixed(s * 100)}%, ${toFixed(l * 100)}%)`;
}

const rgbMatch = /^rgba?\([^()]+\)$/;
const hslMatch = /^hsla?\([^()]+\)$/;
const hexMatch = /^#[\da-f]+$/i;

export function parse($color: string): RGBA {
    const c = $color.trim().toLowerCase();

    if (c.match(rgbMatch)) {
        return parseRGB(c);
    }

    if (c.match(hslMatch)) {
        return parseHSL(c);
    }

    if (c.match(hexMatch)) {
        return parseHex(c);
    }

    if (knownColors.has(c)) {
        return getColorByName(c);
    }

    if (systemColors.has(c)) {
        return getSystemColor(c);
    }

    if ($color === 'transparent') {
        return {r: 0, g: 0, b: 0, a: 0};
    }

    throw new Error(`Unable to parse ${$color}`);
}

function getNumbersFromString(str: string, splitter: RegExp, range: number[], units: {[unit: string]: number}) {
    const raw = str.split(splitter).filter((x) => x);
    const unitsList = Object.entries(units);
    const numbers = raw.map((r) => r.trim()).map((r, i) => {
        let n: number;
        const unit = unitsList.find(([u]) => r.endsWith(u));
        if (unit) {
            n = parseFloat(r.substring(0, r.length - unit[0].length)) / unit[1] * range[i];
        } else {
            n = parseFloat(r);
        }
        if (range[i] > 1) {
            return Math.round(n);
        }
        return n;
    });
    return numbers;
}

const rgbSplitter = /rgba?|\(|\)|\/|,|\s/gi;
const rgbRange = [255, 255, 255, 1];
const rgbUnits = {'%': 100};

function parseRGB($rgb: string) {
    const [r, g, b, a = 1] = getNumbersFromString($rgb, rgbSplitter, rgbRange, rgbUnits);
    return {r, g, b, a};
}

const hslSplitter = /hsla?|\(|\)|\/|,|\s/gi;
const hslRange = [360, 1, 1, 1];
const hslUnits = {'%': 100, 'deg': 360, 'rad': 2 * Math.PI, 'turn': 1};

function parseHSL($hsl: string) {
    const [h, s, l, a = 1] = getNumbersFromString($hsl, hslSplitter, hslRange, hslUnits);
    return hslToRGB({h, s, l, a});
}

function parseHex($hex: string) {
    const h = $hex.substring(1);
    switch (h.length) {
        case 3:
        case 4: {
            const [r, g, b] = [0, 1, 2].map((i) => parseInt(`${h[i]}${h[i]}`, 16));
            const a = h.length === 3 ? 1 : (parseInt(`${h[3]}${h[3]}`, 16) / 255);
            return {r, g, b, a};
        }
        case 6:
        case 8: {
            const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.substring(i, i + 2), 16));
            const a = h.length === 6 ? 1 : (parseInt(h.substring(6, 8), 16) / 255);
            return {r, g, b, a};
        }
    }
    throw new Error(`Unable to parse ${$hex}`);
}

function getColorByName($color: string) {
    const n = knownColors.get($color);
    return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: (n >> 0) & 255,
        a: 1
    };
}

function getSystemColor($color: string) {
    const n = systemColors.get($color);
    return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: (n >> 0) & 255,
        a: 1
    };
}

const knownColors: Map<string, number> = new Map(Object.entries({
    aliceblue: 0xF0F8FF,
    antiquewhite: 0xFAEBD7,
    aqua: 0x00FFFF,
    aquamarine: 0x7FFFD4,
    azure: 0xF0FFFF,
    beige: 0xF5F5DC,
    bisque: 0xFFE4C4,
    black: 0x000000,
    blanchedalmond: 0xFFEBCD,
    blue: 0x0000FF,
    blueviolet: 0x8A2BE2,
    brown: 0xA52A2A,
    burlywood: 0xDEB887,
    cadetblue: 0x5F9EA0,
    chartreuse: 0x7FFF00,
    chocolate: 0xD2691E,
    coral: 0xFF7F50,
    cornflowerblue: 0x6495ED,
    cornsilk: 0xFFF8DC,
    crimson: 0xDC143C,
    cyan: 0x00FFFF,
    darkblue: 0x00008B,
    darkcyan: 0x008B8B,
    darkgoldenrod: 0xB8860B,
    darkgray: 0xA9A9A9,
    darkgrey: 0xA9A9A9,
    darkgreen: 0x006400,
    darkkhaki: 0xBDB76B,
    darkmagenta: 0x8B008B,
    darkolivegreen: 0x556B2F,
    darkorange: 0xFF8C00,
    darkorchid: 0x9932CC,
    darkred: 0x8B0000,
    darksalmon: 0xE9967A,
    darkseagreen: 0x8FBC8F,
    darkslateblue: 0x483D8B,
    darkslategray: 0x2F4F4F,
    darkslategrey: 0x2F4F4F,
    darkturquoise: 0x00CED1,
    darkviolet: 0x9400D3,
    deeppink: 0xFF1493,
    deepskyblue: 0x00BFFF,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1E90FF,
    firebrick: 0xB22222,
    floralwhite: 0xFFFAF0,
    forestgreen: 0x228B22,
    fuchsia: 0xFF00FF,
    gainsboro: 0xDCDCDC,
    ghostwhite: 0xF8F8FF,
    gold: 0xFFD700,
    goldenrod: 0xDAA520,
    gray: 0x808080,
    grey: 0x808080,
    green: 0x008000,
    greenyellow: 0xADFF2F,
    honeydew: 0xF0FFF0,
    hotpink: 0xFF69B4,
    indianred: 0xCD5C5C,
    indigo: 0x4B0082,
    ivory: 0xFFFFF0,
    khaki: 0xF0E68C,
    lavender: 0xE6E6FA,
    lavenderblush: 0xFFF0F5,
    lawngreen: 0x7CFC00,
    lemonchiffon: 0xFFFACD,
    lightblue: 0xADD8E6,
    lightcoral: 0xF08080,
    lightcyan: 0xE0FFFF,
    lightgoldenrodyellow: 0xFAFAD2,
    lightgray: 0xD3D3D3,
    lightgrey: 0xD3D3D3,
    lightgreen: 0x90EE90,
    lightpink: 0xFFB6C1,
    lightsalmon: 0xFFA07A,
    lightseagreen: 0x20B2AA,
    lightskyblue: 0x87CEFA,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xB0C4DE,
    lightyellow: 0xFFFFE0,
    lime: 0x00FF00,
    limegreen: 0x32CD32,
    linen: 0xFAF0E6,
    magenta: 0xFF00FF,
    maroon: 0x800000,
    mediumaquamarine: 0x66CDAA,
    mediumblue: 0x0000CD,
    mediumorchid: 0xBA55D3,
    mediumpurple: 0x9370DB,
    mediumseagreen: 0x3CB371,
    mediumslateblue: 0x7B68EE,
    mediumspringgreen: 0x00FA9A,
    mediumturquoise: 0x48D1CC,
    mediumvioletred: 0xC71585,
    midnightblue: 0x191970,
    mintcream: 0xF5FFFA,
    mistyrose: 0xFFE4E1,
    moccasin: 0xFFE4B5,
    navajowhite: 0xFFDEAD,
    navy: 0x000080,
    oldlace: 0xFDF5E6,
    olive: 0x808000,
    olivedrab: 0x6B8E23,
    orange: 0xFFA500,
    orangered: 0xFF4500,
    orchid: 0xDA70D6,
    palegoldenrod: 0xEEE8AA,
    palegreen: 0x98FB98,
    paleturquoise: 0xAFEEEE,
    palevioletred: 0xDB7093,
    papayawhip: 0xFFEFD5,
    peachpuff: 0xFFDAB9,
    peru: 0xCD853F,
    pink: 0xFFC0CB,
    plum: 0xDDA0DD,
    powderblue: 0xB0E0E6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xFF0000,
    rosybrown: 0xBC8F8F,
    royalblue: 0x4169E1,
    saddlebrown: 0x8B4513,
    salmon: 0xFA8072,
    sandybrown: 0xF4A460,
    seagreen: 0x2E8B57,
    seashell: 0xFFF5EE,
    sienna: 0xA0522D,
    silver: 0xC0C0C0,
    skyblue: 0x87CEEB,
    slateblue: 0x6A5ACD,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xFFFAFA,
    springgreen: 0x00FF7F,
    steelblue: 0x4682B4,
    tan: 0xD2B48C,
    teal: 0x008080,
    thistle: 0xD8BFD8,
    tomato: 0xFF6347,
    turquoise: 0x40E0D0,
    violet: 0xEE82EE,
    wheat: 0xF5DEB3,
    white: 0xFFFFFF,
    whitesmoke: 0xF5F5F5,
    yellow: 0xFFFF00,
    yellowgreen: 0x9ACD32,
}));

const systemColors: Map<string, number> = new Map(Object.entries({
    ActiveBorder: 0x3B99FC,
    ActiveCaption: 0x000000,
    AppWorkspace: 0xAAAAAA,
    Background: 0x6363CE,
    ButtonFace: 0xFFFFFF,
    ButtonHighlight: 0xE9E9E9,
    ButtonShadow: 0x9FA09F,
    ButtonText: 0x000000,
    CaptionText: 0x000000,
    GrayText: 0x7F7F7F,
    Highlight: 0xB2D7FF,
    HighlightText: 0x000000,
    InactiveBorder: 0xFFFFFF,
    InactiveCaption: 0xFFFFFF,
    InactiveCaptionText: 0x000000,
    InfoBackground: 0xFBFCC5,
    InfoText: 0x000000,
    Menu: 0xF6F6F6,
    MenuText: 0xFFFFFF,
    Scrollbar: 0xAAAAAA,
    ThreeDDarkShadow: 0x000000,
    ThreeDFace: 0xC0C0C0,
    ThreeDHighlight: 0xFFFFFF,
    ThreeDLightShadow: 0xFFFFFF,
    ThreeDShadow: 0x000000,
    Window: 0xECECEC,
    WindowFrame: 0xAAAAAA,
    WindowText: 0x000000,
    '-webkit-focus-ring-color': 0xE59700
}).map(([key, value]) => [key.toLowerCase(), value] as [string, number]));
