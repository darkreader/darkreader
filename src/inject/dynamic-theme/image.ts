import type {Theme} from '../../definitions';
import {getSVGFilterMatrixValue} from '../../generators/svg-filter';
import AsyncQueue from '../../utils/async-queue';
import {getSRGBLightness} from '../../utils/color';
import {loadAsBlob, loadAsDataURL} from '../../utils/network';
import {getHashCode} from '../../utils/text';
import {addReadyStateCompleteListener, isReadyStateComplete} from '../utils/dom';
import {logWarn} from '../utils/log';

import {bgFetch} from './network';

export interface ImageDetails {
    src: string;
    dataURL: string;
    width: number;
    height: number;
    isDark: boolean;
    isLight: boolean;
    isTransparent: boolean;
    isLarge: boolean;
    useViewBox?: boolean;
}

const imageManager = new AsyncQueue();

export async function getImageDetails(url: string): Promise<ImageDetails> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<ImageDetails>(async (resolve, reject) => {
        try {
            let dataURL = url.startsWith('data:') ? url : await getDataURL(url);
            const blob = tryConvertDataURLToBlobSync(dataURL) ?? await loadAsBlob(url);
            let image: ImageBitmap | HTMLImageElement;
            let useViewBox = false;
            if (dataURL.startsWith('data:image/svg+xml')) {
                const commaIndex = dataURL.indexOf(',');
                if (commaIndex >= 0) {
                    let svgText = dataURL.slice(commaIndex + 1);
                    const encoding = dataURL.slice(0, commaIndex).split(';')[1];
                    if (encoding === 'base64') {
                        svgText = atob(svgText);
                    } else if (svgText.startsWith('%3c')) {
                        svgText = decodeURIComponent(svgText);
                    }
                    if (svgText.startsWith('<svg ')) {
                        const closingIndex = svgText.indexOf('>');
                        const svgOpening = svgText.slice(0, closingIndex + 1).toLocaleLowerCase();
                        if (svgOpening.includes('viewbox=') && !svgOpening.includes('width=') && !svgOpening.includes('height=')) {
                            useViewBox = true;

                            // Explicitly set size due to unexpected drawImage() behavior
                            const viewboxIndex = svgOpening.indexOf('viewbox=');
                            const quote = svgOpening[viewboxIndex + 8];
                            const viewboxCloseIndex = svgOpening.indexOf(quote, viewboxIndex + 9);
                            const viewBox = svgOpening.slice(viewboxIndex + 9, viewboxCloseIndex).split(' ').map((x) => parseFloat(x));
                            if (viewBox.length === 4 && !viewBox.some((x) => isNaN(x))) {
                                const width = viewBox[2] - viewBox[0];
                                const height = viewBox[3] - viewBox[1];
                                dataURL = `data:image/svg+xml;base64,${btoa(`<svg width="${width}" height="${height}" ${svgText.slice(5)}`)}`;
                            }
                        }
                    }
                }
                image = await loadImage(dataURL);
            } else {
                image = await tryCreateImageBitmap(blob) ?? await loadImage(dataURL);
            }
            imageManager.addTask(() => {
                const analysis = analyzeImage(image);
                resolve({
                    src: url,
                    dataURL: analysis.isLarge ? '' : dataURL,
                    width: image.width,
                    height: image.height,
                    useViewBox,
                    ...analysis,
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function getDataURL(url: string): Promise<string> {
    const parsedURL = new URL(url);
    if (parsedURL.origin === location.origin) {
        return await loadAsDataURL(url);
    }
    return await bgFetch({url, responseType: 'data-url', origin: location.origin});
}

async function tryCreateImageBitmap(blob: Blob) {
    try {
        return await createImageBitmap(blob);
    } catch (err) {
        logWarn(`Unable to create image bitmap for type ${blob.type}: ${String(err)}`);
        return null;
    }
}

const INCOMPLETE_DOC_LOADING_IMAGE_LIMIT = 256;
let loadingImagesCount = 0;

async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(`Unable to load image ${url}`);
        if (++loadingImagesCount <= INCOMPLETE_DOC_LOADING_IMAGE_LIMIT || isReadyStateComplete()) {
            image.src = url;
        } else {
            addReadyStateCompleteListener(() => image.src = url);
        }
    });
}

const MAX_ANALYSIS_PIXELS_COUNT = 32 * 32;
let canvas: HTMLCanvasElement | OffscreenCanvas | null;
let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

function createCanvas() {
    const maxWidth = MAX_ANALYSIS_PIXELS_COUNT;
    const maxHeight = MAX_ANALYSIS_PIXELS_COUNT;
    canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    context = canvas.getContext('2d', {willReadFrequently: true})!;
    context.imageSmoothingEnabled = false;
}

function removeCanvas() {
    canvas = null;
    context = null;
}

const LARGE_IMAGE_PIXELS_COUNT = 512 * 512;

function analyzeImage(image: ImageBitmap | HTMLImageElement) {
    if (!canvas) {
        createCanvas();
    }

    let sw: number;
    let sh: number;
    if (image instanceof HTMLImageElement) {
        sw = image.naturalWidth;
        sh = image.naturalHeight;
    } else {
        sw = image.width;
        sh = image.height;
    }

    if (sw === 0 || sh === 0) {
        logWarn('Image is empty');
        return {
            isDark: false,
            isLight: false,
            isTransparent: false,
            isLarge: false,
        };
    }

    const isLarge = sw * sh > LARGE_IMAGE_PIXELS_COUNT;

    const sourcePixelsCount = sw * sh;
    const k = Math.min(1, Math.sqrt(MAX_ANALYSIS_PIXELS_COUNT / sourcePixelsCount));
    const width = Math.ceil(sw * k);
    const height = Math.ceil(sh * k);
    context!.clearRect(0, 0, width, height);

    context!.drawImage(image, 0, 0, sw, sh, 0, 0, width, height);
    const imageData = context!.getImageData(0, 0, width, height);
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
            r = d[i + 0];
            g = d[i + 1];
            b = d[i + 2];
            a = d[i + 3];

            if (a / 255 < TRANSPARENT_ALPHA_THRESHOLD) {
                transparentPixelsCount++;
            } else {
                l = getSRGBLightness(r, g, b);
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

    return {
        isDark: ((darkPixelsCount / opaquePixelsCount) >= DARK_IMAGE_THRESHOLD),
        isLight: ((lightPixelsCount / opaquePixelsCount) >= LIGHT_IMAGE_THRESHOLD),
        isTransparent: ((transparentPixelsCount / totalPixelsCount) >= TRANSPARENT_IMAGE_THRESHOLD),
        isLarge,
    };
}

let isBlobURLSupported: boolean | null = null;

let canUseProxy = false;
let blobURLCheckRequested = false;
const blobURLCheckAwaiters: Array<() => void> = [];
document.addEventListener('__darkreader__inlineScriptsAllowed', () => canUseProxy = true, {once: true});

export async function requestBlobURLCheck(): Promise<void> {
    if (!canUseProxy) {
        return;
    }
    if (blobURLCheckRequested) {
        return await new Promise<void>((resolve) => blobURLCheckAwaiters.push(resolve));
    }
    blobURLCheckRequested = true;

    await new Promise<void>((resolve) => {
        document.addEventListener('__darkreader__blobURLCheckResponse', (e: CustomEvent) => {
            isBlobURLSupported = e.detail.blobURLAllowed;
            resolve();
            blobURLCheckAwaiters.forEach((r) => r());
            blobURLCheckAwaiters.splice(0);
        }, {once: true});
        document.dispatchEvent(new CustomEvent('__darkreader__blobURLCheckRequest'));
    });
}

export function isBlobURLCheckResultReady(): boolean {
    return isBlobURLSupported != null || !canUseProxy;
}

function onCSPError(err: SecurityPolicyViolationEvent) {
    if (err.blockedURI === 'blob') {
        isBlobURLSupported = false;
        document.removeEventListener('securitypolicyviolation', onCSPError);
    }
}

document.addEventListener('securitypolicyviolation', onCSPError);

const objectURLs = new Set<string>();

export function getFilteredImageURL({dataURL, width, height, useViewBox}: ImageDetails, theme: Theme): string {
    if (dataURL.startsWith('data:image/svg+xml')) {
        dataURL = escapeXML(dataURL);
    }
    const matrix = getSVGFilterMatrixValue(theme);
    const size = useViewBox ? `viewBox="0 0 ${width} ${height}"` : `width="${width}" height="${height}"`;
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ${size}>`,
        '<defs>',
        '<filter id="darkreader-image-filter">',
        `<feColorMatrix type="matrix" values="${matrix}" />`,
        '</filter>',
        '</defs>',
        `<image width="${width}" height="${height}" filter="url(#darkreader-image-filter)" xlink:href="${dataURL}" />`,
        '</svg>',
    ].join('');

    if (!isBlobURLSupported) {
        return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    const bytes = new Uint8Array(svg.length);
    for (let i = 0; i < svg.length; i++) {
        bytes[i] = svg.charCodeAt(i);
    }
    const blob = new Blob([bytes], {type: 'image/svg+xml'});
    const objectURL = URL.createObjectURL(blob);
    objectURLs.add(objectURL);
    return objectURL;
}

const xmlEscapeChars: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '\'': '&apos;',
    '"': '&quot;',
};

function escapeXML(str: string): string {
    return str.replace(/[<>&'"]/g, (c: string) => xmlEscapeChars[c] ?? c);
}

const dataURLBlobURLs = new Map<number, string>();

function tryConvertDataURLToBlobSync(dataURL: string): Blob | null {
    const colonIndex = dataURL.indexOf(':');
    const semicolonIndex = dataURL.indexOf(';', colonIndex + 1);
    const commaIndex = dataURL.indexOf(',', semicolonIndex + 1);
    const encoding = dataURL.substring(semicolonIndex + 1, commaIndex).toLocaleLowerCase();
    const mediaType = dataURL.substring(colonIndex + 1, semicolonIndex);

    // It should be possible to easily convert UTF-8,
    // though it is unclear if decodeURIComponent will be necessary
    // and if it will be performant enough for big Data URLs
    if (encoding !== 'base64' || !mediaType) {
        return null;
    }
    const characters = atob(dataURL.substring(commaIndex + 1));
    const bytes = new Uint8Array(characters.length);
    for (let i = 0; i < characters.length; i++) {
        bytes[i] = characters.charCodeAt(i);
    }
    return new Blob([bytes], {type: mediaType});
}

export async function tryConvertDataURLToBlobURL(dataURL: string): Promise<string | null> {
    if (!isBlobURLSupported) {
        return null;
    }
    const hash = getHashCode(dataURL);
    let blobURL = dataURLBlobURLs.get(hash);
    if (blobURL) {
        return blobURL;
    }

    let blob = tryConvertDataURLToBlobSync(dataURL);
    if (!blob) {
        const response = await fetch(dataURL);
        blob = await response.blob();
    }

    blobURL = URL.createObjectURL(blob);
    dataURLBlobURLs.set(hash, blobURL);
    return blobURL;
}

export function cleanImageProcessingCache(): void {
    imageManager && imageManager.stop();
    removeCanvas();
    objectURLs.forEach((u) => URL.revokeObjectURL(u));
    objectURLs.clear();
    dataURLBlobURLs.forEach((u) => URL.revokeObjectURL(u));
    dataURLBlobURLs.clear();
}
