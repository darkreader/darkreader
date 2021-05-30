import {getSVGFilterMatrixValue} from '../../generators/svg-filter';
import {bgFetch} from './network';
import {loadAsDataURL} from '../../utils/network';
import type {FilterConfig} from '../../definitions';
import type {WorkerData} from '../../background/analyze-image';

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

let imageID = 0;
const imageResolvers = new Map<number, (data: ImageDetails) => void>();
const imageRejectors = new Map<number, () => void>();

async function urlToImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(`Unable to load image ${url}`);
        image.src = url;
    });
}


function preAnalyzeImage(image: HTMLImageElement) {
    if (!canvas) {
        createCanvas();
    }
    const {naturalWidth, naturalHeight} = image;
    if (naturalHeight === 0 || naturalWidth === 0) {
        return null;
    }
    const naturalPixelsCount = naturalWidth * naturalHeight;
    const k = Math.min(1, Math.sqrt(MAX_ANALIZE_PIXELS_COUNT / naturalPixelsCount));
    const width = Math.ceil(naturalWidth * k);
    const height = Math.ceil(naturalHeight * k);
    context.clearRect(0, 0, width, height);

    context.drawImage(image, 0, 0, naturalWidth, naturalHeight, 0, 0, width, height);
    return [context.getImageData(0, 0, width, height).data.buffer, width, height, naturalWidth, naturalHeight];
}

export async function getImageDetails(url: string) {
    return new Promise<ImageDetails>(async (resolve, reject) => {
        let dataURL: string;
        if (url.startsWith('data:')) {
            dataURL = url;
        } else {
            dataURL = await getImageDataURL(url);
        }
        const imageData = preAnalyzeImage(await urlToImage(dataURL));

        const id = ++imageID;
        imageResolvers.set(id, resolve);
        imageRejectors.set(id, reject);
        chrome.runtime.sendMessage({type: 'analyze-image', data: [dataURL, url, id, ...imageData], id});
    });
}

chrome.runtime.onMessage.addListener(({type, data, id}) => {
    if (type === 'analyze-image-response') {
        const {url, dataURL, details, success} = data as WorkerData;
        const resolve = imageResolvers.get(id);
        const reject = imageRejectors.get(id);
        imageResolvers.delete(id);
        imageRejectors.delete(id);

        if (!success) {
            reject && reject();
        } else {
            resolve && resolve({
                src: url,
                dataURL,
                ...details
            });
        }
    }
});

async function getImageDataURL(url: string) {
    const parsedURL = new URL(url);
    if (parsedURL.origin === location.origin) {
        return await loadAsDataURL(url);
    }
    return await bgFetch({url, responseType: 'data-url'});
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
    objectURLs.forEach((u) => URL.revokeObjectURL(u));
    objectURLs.clear();
}
