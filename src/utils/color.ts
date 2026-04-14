import {evalMath} from './math-eval';
import {isSystemDarkModeEnabled} from './media-query';
import {getParenthesesRange} from './text';

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

const hslaParseCache = new Map<string, HSLA>();
const rgbaParseCache = new Map<string, RGBA>();

export function parseColorWithCache($color: string): RGBA | null {
    $color = $color.trim();
    if (rgbaParseCache.has($color)) {
        return rgbaParseCache.get($color)!;
    }
    // We cannot _really_ parse any color which has the calc() expression,
    // so we try our best to remove those and then parse the value.
    if ($color.includes('calc(')) {
        $color = lowerCalcExpression($color);
    }
    const color = parse($color);
    if (color) {
        rgbaParseCache.set($color, color);
        return color;
    }
    return null;
}

export function parseToHSLWithCache(color: string): HSLA | null {
    if (hslaParseCache.has(color)) {
        return hslaParseCache.get(color)!;
    }
    const rgb = parseColorWithCache(color);
    if (!rgb) {
        return null;
    }
    const hsl = rgbToHSL(rgb);
    hslaParseCache.set(color, hsl);
    return hsl;
}

export function clearColorCache(): void {
    hslaParseCache.clear();
    rgbaParseCache.clear();
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

function toFixed(n: number, digits = 0): string {
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

export function rgbToString(rgb: RGBA): string {
    const {r, g, b, a} = rgb;
    if (a != null && a < 1) {
        return `rgba(${toFixed(r)}, ${toFixed(g)}, ${toFixed(b)}, ${toFixed(a, 2)})`;
    }
    return `rgb(${toFixed(r)}, ${toFixed(g)}, ${toFixed(b)})`;
}

export function rgbToHexString({r, g, b, a}: RGBA): string {
    return `#${(a != null && a < 1 ? [r, g, b, Math.round(a * 255)] : [r, g, b]).map((x) => {
        return `${x < 16 ? '0' : ''}${x.toString(16)}`;
    }).join('')}`;
}

export function hslToString(hsl: HSLA): string {
    const {h, s, l, a} = hsl;
    if (a != null && a < 1) {
        return `hsla(${toFixed(h)}, ${toFixed(s * 100)}%, ${toFixed(l * 100)}%, ${toFixed(a, 2)})`;
    }
    return `hsl(${toFixed(h)}, ${toFixed(s * 100)}%, ${toFixed(l * 100)}%)`;
}

const rgbMatch = /^rgba?\([^\(\)]+\)$/;
const hslMatch = /^hsla?\([^\(\)]+\)$/;
const hexMatch = /^#[0-9a-f]+$/i;

const supportedColorFuncs = [
    'color',
    'color-mix',
    'hwb',
    'lab',
    'lch',
    'oklab',
    'oklch',
];

export function parse($color: string): RGBA | null {
    const c = $color.trim().toLowerCase();
    if (c.includes('(from ')) {
        if (c.indexOf('(from') !== c.lastIndexOf('(from')) {
            return null;
        }
        return domParseColor(c);
    }

    if (c.match(rgbMatch)) {
        if (c.startsWith('rgb(#') || c.startsWith('rgba(#')) {
            if (c.lastIndexOf('rgb') > 0) {
                return null;
            }
            return domParseColor(c);
        }
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

    if (c === 'transparent') {
        return {r: 0, g: 0, b: 0, a: 0};
    }

    if (
        c.endsWith(')') &&
        supportedColorFuncs.some(
            (fn) => c.startsWith(fn) && c[fn.length] === '(' && c.lastIndexOf(fn) === 0
        )
    ) {
        return domParseColor(c);
    }

    if (c.startsWith('light-dark(') && c.endsWith(')')) {
        // light-dark([color()], [color()])
        const match = c.match(/^light-dark\(\s*([a-z]+(\(.*\))?),\s*([a-z]+(\(.*\))?)\s*\)$/);
        if (match) {
            const schemeColor = isSystemDarkModeEnabled() ? match[3] : match[1];
            return parse(schemeColor);
        }
    }

    return null;
}

const C_0 = '0'.charCodeAt(0);
const C_9 = '9'.charCodeAt(0);
const C_e = 'e'.charCodeAt(0);
const C_DOT = '.'.charCodeAt(0);
const C_PLUS = '+'.charCodeAt(0);
const C_MINUS = '-'.charCodeAt(0);
const C_SPACE = ' '.charCodeAt(0);
const C_COMMA = ','.charCodeAt(0);
const C_SLASH = '/'.charCodeAt(0);
const C_PERCENT = '%'.charCodeAt(0);

function getNumbersFromString(input: string, range: number[], units: {[unit: string]: number}) {
    const numbers: number[] = [];
    const searchStart = input.indexOf('(') + 1;
    const searchEnd = input.length - 1;
    let numStart = -1;
    let unitStart = -1;

    const push = (matchEnd: number) => {
        const numEnd = unitStart > -1 ? unitStart : matchEnd;
        const $num = input.slice(numStart, numEnd);
        let n = parseFloat($num);
        const r = range[numbers.length];
        if (unitStart > -1) {
            const unit = input.slice(unitStart, matchEnd);
            const u = units[unit];
            if (u != null) {
                n *= r / u;
            }
        }
        if (r > 1) {
            n = Math.round(n);
        }
        numbers.push(n);
        numStart = -1;
        unitStart = -1;
    };

    for (let i = searchStart; i < searchEnd; i++) {
        const c = input.charCodeAt(i);
        const isNumChar = (c >= C_0 && c <= C_9) || c === C_DOT || c === C_PLUS || c === C_MINUS || c === C_e;
        const isDelimiter = c === C_SPACE || c === C_COMMA || c === C_SLASH;
        if (isNumChar) {
            if (numStart === -1) {
                numStart = i;
            }
        } else if (numStart > -1) {
            if (isDelimiter) {
                push(i);
            } else if (unitStart === -1) {
                unitStart = i;
            }
        }
    }
    if (numStart > -1) {
        push(searchEnd);
    }
    return numbers;
}

const rgbRange = [255, 255, 255, 1];
const rgbUnits = {'%': 100};

export function getRGBValues(input: string): number[] | null {
    const CHAR_CODE_0 = 48;
    const length = input.length;
    let i = 0;
    let digitsCount = 0;
    let digitSequence = false;
    let floatDigitsCount = -1;
    let delimiter = C_SPACE;
    let channel = -1;
    let result: number[] | null = null;
    while (i < length) {
        const c = input.charCodeAt(i);
        if ((c >= C_0 && c <= C_9) || c === C_DOT) {
            if (!digitSequence) {
                digitSequence = true;
                digitsCount = 0;
                floatDigitsCount = -1;
                channel++;
                if (channel === 3 && result) {
                    result[3] = 0;
                }
                if (channel > 3) {
                    return null;
                }
            }
            if (c === C_DOT) {
                if (floatDigitsCount > 0) {
                    return null;
                }
                floatDigitsCount = 0;
            } else {
                const d = c - CHAR_CODE_0;
                if (!result) {
                    result = [0, 0, 0, 1];
                }
                if (floatDigitsCount > -1) {
                    floatDigitsCount++;
                    result[channel] += d / (10 ** floatDigitsCount);
                } else {
                    digitsCount++;
                    if (digitsCount > 3) {
                        return null;
                    }
                    result[channel] = result[channel] * 10 + d;
                }
            }
        } else if (c === C_PERCENT) {
            if (channel < 0 || channel > 3 || delimiter !== C_SPACE || !result) {
                return null;
            }
            result[channel] = channel < 3 ? Math.round(result[channel] * 255 / 100) : (result[channel] / 100);
            digitSequence = false;
        } else {
            digitSequence = false;
            if (c === C_SPACE) {
                if (channel === 0) {
                    delimiter = c;
                }
            } else if (c === C_COMMA) {
                if (channel === -1) {
                    return null;
                }
                delimiter = C_COMMA;
            } else if (c === C_SLASH) {
                if (channel !== 2 || delimiter !== C_SPACE) {
                    return null;
                }
            } else {
                return null;
            }
        }
        i++;
    }
    if (channel < 2 || channel > 3) {
        return null;
    }
    return result;
}

function parseRGB($rgb: string): RGBA | null {
    const [r, g, b, a = 1] = getNumbersFromString($rgb, rgbRange, rgbUnits);
    if (r == null || g == null || b == null || a == null) {
        return null;
    }
    return {r, g, b, a};
}

const hslRange = [360, 1, 1, 1];
const hslUnits = {'%': 100, 'deg': 360, 'rad': 2 * Math.PI, 'turn': 1};

function parseHSL($hsl: string): RGBA | null {
    const [h, s, l, a = 1] = getNumbersFromString($hsl, hslRange, hslUnits);
    if (h == null || s == null || l == null || a == null) {
        return null;
    }
    return hslToRGB({h, s, l, a});
}

const C_A = 'A'.charCodeAt(0);
const C_F = 'F'.charCodeAt(0);
const C_a = 'a'.charCodeAt(0);
const C_f = 'f'.charCodeAt(0);

function parseHex($hex: string): RGBA | null {
    const length = $hex.length;
    const digitCount = length - 1;
    const isShort = digitCount === 3 || digitCount === 4;
    const isLong = digitCount === 6 || digitCount === 8;
    if (!isShort && !isLong) {
        return null;
    }

    const hex = (i: number) => {
        const c = $hex.charCodeAt(i);
        if (c >= C_A && c <= C_F) {
            return c + 10 - C_A;
        }
        if (c >= C_a && c <= C_f) {
            return c + 10 - C_a;
        }
        return c - C_0;
    };

    let r: number;
    let g: number;
    let b: number;
    let a = 1;
    if (isShort) {
        r = hex(1) * 17;
        g = hex(2) * 17;
        b = hex(3) * 17;
        if (digitCount === 4) {
            a = hex(4) * 17 / 255;
        }
    } else {
        r = hex(1) * 16 + hex(2);
        g = hex(3) * 16 + hex(4);
        b = hex(5) * 16 + hex(6);
        if (digitCount === 8) {
            a = (hex(7) * 16 + hex(8)) / 255;
        }
    }

    return {r, g, b, a};
}

function getColorByName($color: string): RGBA {
    const n = knownColors.get($color)!;
    return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: (n >> 0) & 255,
        a: 1,
    };
}

function getSystemColor($color: string): RGBA {
    const n = systemColors.get($color)!;
    return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: (n >> 0) & 255,
        a: 1,
    };
}

// lowerCalcExpression is a helper function that tries to remove `calc(...)`
// expressions from the given string. It can only lower expressions to a certain
// degree so we can keep this function easy and simple to understand.
export function lowerCalcExpression(color: string): string {
    // searchIndex will be used as searchIndex and as a "cursor" within
    // the calc(...) expression.
    let searchIndex = 0;

    // Replace the content between two indices.
    const replaceBetweenIndices = (start: number, end: number, replacement: string) => {
        color = color.substring(0, start) + replacement + color.substring(end);
    };

    // Run this code until it doesn't find any `calc(...)`.
    while ((searchIndex = color.indexOf('calc(')) !== -1) {
        // Get the parentheses ranges of `calc(...)`.
        const range = getParenthesesRange(color, searchIndex);
        if (!range) {
            break;
        }

        // Get the content between the parentheses.
        let slice = color.slice(range.start + 1, range.end - 1);
        // Does the content include a percentage?
        const includesPercentage = slice.includes('%');
        // Remove all percentages.
        slice = slice.split('%').join('');

        // Pass the content to the evalMath library and round its output.
        const output = Math.round(evalMath(slice));

        // Replace `calc(...)` with the result.
        replaceBetweenIndices(range.start - 4, range.end, output + (includesPercentage ? '%' : ''));
    }
    return color;
}

const knownColors: Map<string, number> = new Map(Object.entries({
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgrey: 0xa9a9a9,
    darkgreen: 0x006400,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    grey: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgrey: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32,
}));

const systemColors: Map<string, number> = new Map(Object.entries({
    ActiveBorder: 0x3b99fc,
    ActiveCaption: 0x000000,
    AppWorkspace: 0xaaaaaa,
    Background: 0x6363ce,
    ButtonFace: 0xffffff,
    ButtonHighlight: 0xe9e9e9,
    ButtonShadow: 0x9fa09f,
    ButtonText: 0x000000,
    CaptionText: 0x000000,
    GrayText: 0x7f7f7f,
    Highlight: 0xb2d7ff,
    HighlightText: 0x000000,
    InactiveBorder: 0xffffff,
    InactiveCaption: 0xffffff,
    InactiveCaptionText: 0x000000,
    InfoBackground: 0xfbfcc5,
    InfoText: 0x000000,
    Menu: 0xf6f6f6,
    MenuText: 0xffffff,
    Scrollbar: 0xaaaaaa,
    ThreeDDarkShadow: 0x000000,
    ThreeDFace: 0xc0c0c0,
    ThreeDHighlight: 0xffffff,
    ThreeDLightShadow: 0xffffff,
    ThreeDShadow: 0x000000,
    Window: 0xececec,
    WindowFrame: 0xaaaaaa,
    WindowText: 0x000000,
    '-webkit-focus-ring-color': 0xe59700,
}).map(([key, value]) => [key.toLowerCase(), value] as [string, number]));

// https://en.wikipedia.org/wiki/Relative_luminance
export function getSRGBLightness(r: number, g: number, b: number): number {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

let canvas: HTMLCanvasElement;
let context: CanvasRenderingContext2D;

function domParseColor($color: string) {
    if (!context) {
        canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        context = canvas.getContext('2d', {willReadFrequently: true})!;
    }
    context.fillStyle = $color;
    context.fillRect(0, 0, 1, 1);
    const d = context.getImageData(0, 0, 1, 1).data;
    const color = `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${(d[3] / 255).toFixed(2)})`;
    return parseRGB(color);
}
