import {getSVGFilterMatrixValue} from '../../generators/svg-filter';
import {bgFetch} from './network';
import {loadAsDataURL} from '../../utils/network';
import type {FilterConfig} from '../../definitions';
import {logInfo, logWarn} from '../utils/log';

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

let imageManager: AnalyzeImageManager;
let MAX_IMAGES_PER_SECOND = 30;

export function setImagesPerSecond(value: number) {
    if (imageManager) {
        imageManager.setImagesPerSecond(value);
    } else {
        MAX_IMAGES_PER_SECOND = value || 1;
    }
}

export async function getImageDetails(url: string) {
    return new Promise<ImageDetails>(async (resolve) => {
        if (!imageManager) {
            imageManager = new AnalyzeImageManager(MAX_IMAGES_PER_SECOND);
        }
        let dataURL: string;
        if (url.startsWith('data:')) {
            dataURL = url;
        } else {
            dataURL = await getImageDataURL(url);
        }

        const image = await urlToImage(dataURL);
        imageManager.addToQueue({
            image,
            onResolve: (details: ImageDetails) => {
                resolve({
                    src: url,
                    dataURL,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                    ...details,
                });
            },
        });
    });
}

async function getImageDataURL(url: string) {
    const parsedURL = new URL(url);
    if (parsedURL.origin === location.origin) {
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

export interface ImageQueueEntry {
    image: HTMLImageElement;
    onResolve: (details: AnalyzeImageResults) => void;
}

interface AnalyzeImageResults {
    isDark: boolean;
    isLight: boolean;
    isTransparent: boolean;
    isLarge: boolean;
}

// AnalyzeImage is a very slow function, so will add a manager on top of it
// This manager will be responsible for analyzing incoming images of the queue.
// And will only allow certain amount of images to be analyzed per second.
// This is to avoid too much memory usage and CPU usage.
class AnalyzeImageManager {
    private queue: ImageQueueEntry[] = [];
    private timerID: number = null;
    private maxImagesPerSecond: number;

    constructor(maxImagesPerSecond: number) {
        this.maxImagesPerSecond = maxImagesPerSecond;
    }

    addToQueue(entry: ImageQueueEntry) {
        this.queue.push(entry);
        logInfo(this.queue.length);
        if (this.timerID == null) {
            this.startQueue();
        }
    }

    stopAnalyzing() {
        if (this.timerID !== null) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        this.removeCanvas();
        this.queue = [];
    }

    setImagesPerSecond(value: number) {
        if (this.maxImagesPerSecond !== value) {
            this.maxImagesPerSecond = value;
            if (this.timerID !== null) {
                clearTimeout(this.timerID);
                this.timerID = null;
                this.startQueue();
            }
        }
    }

    private startQueue() {
        this.timerID = setInterval(() => {
            const queueEntry = this.queue.shift();
            if (queueEntry) {
                const result = this.analyzeImage(queueEntry.image);
                queueEntry.onResolve(result);
            } else {
                clearInterval(this.timerID);
                this.timerID = null;
            }
        }, 1000 / this.maxImagesPerSecond);
    }

    private MAX_ANALIZE_PIXELS_COUNT = 32 * 32;
    private canvas: HTMLCanvasElement | OffscreenCanvas;
    private context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

    private createCanvas() {
        const maxWidth = this.MAX_ANALIZE_PIXELS_COUNT;
        const maxHeight = this.MAX_ANALIZE_PIXELS_COUNT;
        this.canvas = document.createElement('canvas');
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        this.context = this.canvas.getContext('2d');
        this.context.imageSmoothingEnabled = false;
    }

    private removeCanvas() {
        this.canvas = null;
        this.context = null;
    }

    private analyzeImage(image: HTMLImageElement): AnalyzeImageResults {
        if (!this.canvas) {
            this.createCanvas();
        }
        const {naturalWidth, naturalHeight} = image;
        if (naturalHeight === 0 || naturalWidth === 0) {
            logWarn(`logWarn(Image is empty ${image.currentSrc})`);
            return null;
        }
        const naturalPixelsCount = naturalWidth * naturalHeight;
        const k = Math.min(1, Math.sqrt(this.MAX_ANALIZE_PIXELS_COUNT / naturalPixelsCount));
        const width = Math.ceil(naturalWidth * k);
        const height = Math.ceil(naturalHeight * k);
        this.context.clearRect(0, 0, width, height);

        this.context.drawImage(image, 0, 0, naturalWidth, naturalHeight, 0, 0, width, height);
        const imageData = this.context.getImageData(0, 0, width, height);
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
}

export function getFilteredImageDataURL({dataURL, width, height}: ImageDetails, theme: FilterConfig): string {
    const matrix = getSVGFilterMatrixValue(theme);
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
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function cleanImageProcessingCache() {
    imageManager && imageManager.stopAnalyzing();
}
