function analyzeImage(pixels: ArrayBufferLike, width: number, height: number, naturalWidth: number, naturalHeight: number) {
    const naturalPixelsCount = naturalWidth * naturalHeight;
    const d = new ImageData(
        new Uint8ClampedArray(pixels),
        width,
        height
    );

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
        width: naturalWidth,
        height: naturalHeight,
    };
}
export interface WorkerData {
    dataURL: string;
    url: string;
    details: {
        isDark: boolean;
        isLight: boolean;
        isTransparent: boolean;
        isLarge: boolean;
        width: number;
        height: number;
    };
    success: boolean;
    id: number;
    senderID: number;
}

onmessage = async function (e: MessageEvent) {
    const [dataURL, url, id, pixels, width, height, naturalWidth, naturalHeight, senderID] = e.data;

    (self.postMessage as Worker['postMessage'])({success: true, dataURL, url, id, senderID, details: analyzeImage(pixels, width, height, naturalWidth, naturalHeight)});
};
