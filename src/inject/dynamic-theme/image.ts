import {getSVGFilterMatrixValue} from '../../generators/svg-filter';
import {bgFetch} from './network';
import {getURLHost} from '../../utils/url';
import {loadAsDataURL} from '../../utils/network';
import {FilterConfig} from '../../definitions';

export interface ImageDetails {
    src: string;
    dataURL: string;
    width: number;
    height: number;
    isDark: boolean;
    isLight: boolean;
    isTransparent: boolean;
    isLarge: boolean;
}

export async function getImageDetails(url: string) {
    let dataURL: string;
    if (url.startsWith('data:')) {
        dataURL = url;
    } else {
        dataURL = await getImageDataURL(url);
    }
    const image = await urlToImage(dataURL);
    const info = analyzeImage(image);
    return {
        src: url,
        dataURL,
        width: image.naturalWidth,
        height: image.naturalHeight,
        ...info,
    };
}

async function getImageDataURL(url: string) {
    if (getURLHost(url) === location.host) {
        return await loadAsDataURL(url);
    }
    return await bgFetch({url, responseType: 'data-url'});
}

async function urlToImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(`Unable to load image ${url}`);
        image.src = url;
    });
}

const MAX_ANALIZE_PIXELS_COUNT = 32 * 32;
let canvas: HTMLCanvasElement | OffscreenCanvas;
let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createCanvas() {
    const maxWidth = MAX_ANALIZE_PIXELS_COUNT;
    const maxHeight = MAX_ANALIZE_PIXELS_COUNT;
    canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
}

function removeCanvas() {
    canvas = null;
    context = null;
}

function analyzeImage(image: HTMLImageElement) {
    if (!canvas) {
        createCanvas();
    }
    const {naturalWidth, naturalHeight} = image;
    const naturalPixelsCount = naturalWidth * naturalHeight;
    const k = Math.min(1, Math.sqrt(MAX_ANALIZE_PIXELS_COUNT / naturalPixelsCount));
    const width = Math.ceil(naturalWidth * k);
    const height = Math.ceil(naturalHeight * k);
    context.clearRect(0, 0, width, height);

    context.drawImage(image, 0, 0, naturalWidth, naturalHeight, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const d = imageData.data;

    const TRANSPARENT_ALPHA_THRESHOLD = 0.05;
    const DARK_LIGHTNESS_THRESHOLD = 0.4;
    const LIGHT_LIGHTNESS_THRESHOLD = 0.7;

    let transparentPixelsCount = 0;
    let darkPixelsCount = 0;
    let lightPixelsCount = 0;

    let i: number, x: number, y: number;
    let r: number, g: number, b: number, a: number;
    let l: number;
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            i = 4 * (y * width + x);
            r = d[i + 0] / 255;
            g = d[i + 1] / 255;
            b = d[i + 2] / 255;
            a = d[i + 3] / 255;

            if (a < TRANSPARENT_ALPHA_THRESHOLD) {
                transparentPixelsCount++;
            } else {
                // Use sRGB to determine the `pixel Lightness`
                // https://en.wikipedia.org/wiki/Relative_luminance
                l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                if (l < DARK_LIGHTNESS_THRESHOLD) {
                    darkPixelsCount++;
                }
                if (l > LIGHT_LIGHTNESS_THRESHOLD) {
                    lightPixelsCount++;
                }
            }
        }
    }

    const totalPixelsCount = width * height;
    const opaquePixelsCount = totalPixelsCount - transparentPixelsCount;

    const DARK_IMAGE_THRESHOLD = 0.7;
    const LIGHT_IMAGE_THRESHOLD = 0.7;
    const TRANSPARENT_IMAGE_THRESHOLD = 0.1;
    const LARGE_IMAGE_PIXELS_COUNT = 800 * 600;

    return {
        isDark: ((darkPixelsCount / opaquePixelsCount) >= DARK_IMAGE_THRESHOLD),
        isLight: ((lightPixelsCount / opaquePixelsCount) >= LIGHT_IMAGE_THRESHOLD),
        isTransparent: ((transparentPixelsCount / totalPixelsCount) >= TRANSPARENT_IMAGE_THRESHOLD),
        isLarge: (naturalPixelsCount >= LARGE_IMAGE_PIXELS_COUNT),
    };
}

const objectURLs = new Set<string>();

export function getFilteredImageDataURL({dataURL, width, height}: ImageDetails, filter: FilterConfig) {
    const matrix = getSVGFilterMatrixValue(filter);
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">`,
        '<defs>',
        '<filter id="darkreader-image-filter">',
        `<feColorMatrix type="matrix" values="${matrix}" />`,
        '</filter>',
        '</defs>',
        `<image width="${width}" height="${height}" filter="url(#darkreader-image-filter)" xlink:href="${dataURL}" />`,
        '</svg>',
    ].join('');
    const bytes = new Uint8Array(svg.length);
    for (let i = 0; i < svg.length; i++) {
        bytes[i] = svg.charCodeAt(i);
    }
    const blob = new Blob([bytes], {type: 'image/svg+xml'});
    const objectURL = URL.createObjectURL(blob);
    objectURLs.add(objectURL);
    return objectURL;
}

export function cleanImageProcessingCache() {
    removeCanvas();
    objectURLs.forEach((u) => URL.revokeObjectURL(u));
    objectURLs.clear();
}
