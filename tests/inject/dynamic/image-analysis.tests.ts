import '../support/polyfills';
import {DEFAULT_THEME} from '../../../src/defaults';
import type {DynamicThemeFix} from '../../../src/definitions';
import {createOrUpdateDynamicTheme, removeDynamicTheme} from '../../../src/inject/dynamic-theme';
import {getImageDetails} from '../../../src/inject/dynamic-theme/image';
import {multiline, timeout, waitForEvent} from '../support/test-utils';

const theme = {
    ...DEFAULT_THEME,
    darkSchemeBackgroundColor: 'black',
    darkSchemeTextColor: 'white',
};
let container: HTMLElement;

beforeEach(() => {
    container = document.body;
    container.innerHTML = '';
});

afterEach(() => {
    removeDynamicTheme();
    container.innerHTML = '';
});

function svgToDataURL(svg: string) {
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function getSVGImageCSS(svg: string, width: number, height: number, selector: string) {
    return multiline(
        `${selector} {`,
        `    background-image: url("${svgToDataURL(svg)}");`,
        '    background-position: center;',
        '    background-repeat: no-repeat;',
        '    background-size: cover;',
        '    display: inline-block;',
        `    height: ${height}px;`,
        `    width: ${width}px;`,
        '}',
    );
}

const images = {
    darkIcon: multiline(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8">',
        '    <rect fill="black" width="100%" height="100%" />',
        '</svg>',
    ),
    lightIcon: multiline(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8">',
        '    <rect fill="white" width="100%" height="100%" />',
        '</svg>',
    ),
    darkTransparentIcon: multiline(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8">',
        '    <circle fill="black" cx="4" cy="4" r="3" />',
        '</svg>',
    ),
    lightTransparentIcon: multiline(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8">',
        '    <circle fill="white" cx="4" cy="4" r="3" />',
        '</svg>',
    ),
    largeDarkImage: multiline(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="1024" height="1024">',
        '    <rect fill="black" width="100%" height="100%" />',
        '</svg>',
    ),
    largeLightImage: multiline(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="1024" height="1024">',
        '    <rect fill="white" width="100%" height="100%" />',
        '</svg>',
    ),
};

async function urlToImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(`Unable to load image ${url}`);
        image.src = url;
    });
}

async function getBgImageInfo(bgImageValue: string) {
    const bgImageURL = bgImageValue.match(/^url\("(.*)"\)$/)[1];
    const image = await urlToImage(bgImageURL);

    const width = 8;
    const height = 8;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);

    const d = context.getImageData(0, 0, width, height).data;
    let lightPixels = 0;
    let darkPixels = 0;
    let opaquePixels = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = 4 * (x + width * y);
            const r = d[i + 0];
            const g = d[i + 1];
            const b = d[i + 2];
            const a = d[i + 3];
            if (a > 127) {
                opaquePixels++;
                const lightness = (r + g + b) / 3 / 255;
                if (lightness > 0.7) {
                    lightPixels++;
                } else if (lightness < 0.3) {
                    darkPixels++;
                }
            }
        }
    }
    return {
        lightness: lightPixels / opaquePixels,
        darkness: darkPixels / opaquePixels,
    };
}

describe('IMAGE ANALYSIS', () => {
    it('should analyze dark icon', async () => {
        const details = await getImageDetails(svgToDataURL(images.darkIcon));
        expect(details.width).toBe(8);
        expect(details.height).toBe(8);
        expect(details.isDark).toBe(true);
        expect(details.isLight).toBe(false);
        expect(details.isTransparent).toBe(false);
        expect(details.isLarge).toBe(false);
    });

    it('should analyze light icon', async () => {
        const details = await getImageDetails(svgToDataURL(images.lightIcon));
        expect(details.width).toBe(8);
        expect(details.height).toBe(8);
        expect(details.isDark).toBe(false);
        expect(details.isLight).toBe(true);
        expect(details.isTransparent).toBe(false);
        expect(details.isLarge).toBe(false);
    });

    it('should analyze dark transparent icon', async () => {
        const details = await getImageDetails(svgToDataURL(images.darkTransparentIcon));
        expect(details.width).toBe(8);
        expect(details.height).toBe(8);
        expect(details.isDark).toBe(true);
        expect(details.isLight).toBe(false);
        expect(details.isTransparent).toBe(true);
        expect(details.isLarge).toBe(false);
    });

    it('should not analyze large image', async () => {
        const details = await getImageDetails(svgToDataURL(images.largeDarkImage));
        expect(details.width).toBe(1024);
        expect(details.height).toBe(1024);
        expect(details.isLarge).toBe(true);
    });

    it('should invert dark icons', async () => {
        container.innerHTML = multiline(
            '<style>',
            getSVGImageCSS(images.darkTransparentIcon, 16, 16, 'i'),
            '</style>',
            '<h1>Dark icon <i></i></h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        await timeout(500);
        const bgImageValue = getComputedStyle(container.querySelector('i')).backgroundImage;
        const info = await getBgImageInfo(bgImageValue);
        expect(info.darkness).toBe(0);
        expect(info.lightness).toBe(1);
    });

    it('should not invert light icons', async () => {
        container.innerHTML = multiline(
            '<style>',
            getSVGImageCSS(images.lightTransparentIcon, 16, 16, 'i'),
            '</style>',
            '<h1>Light icon <i></i></h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const bgImageValue = getComputedStyle(container.querySelector('i')).backgroundImage;
        const info = await getBgImageInfo(bgImageValue);
        expect(info.darkness).toBe(0);
        expect(info.lightness).toBe(1);
    });

    it('should not invert dark backgrounds', async () => {
        container.innerHTML = multiline(
            '<style>',
            getSVGImageCSS(images.largeDarkImage, 320, 320, 'h1'),
            '</style>',
            '<h1>Dark background</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        const bgImageValue = getComputedStyle(container.querySelector('h1')).backgroundImage;
        const info = await getBgImageInfo(bgImageValue);
        expect(info.darkness).toBe(1);
        expect(info.lightness).toBe(0);
    });

    it('should hide light backgrounds', async () => {
        container.innerHTML = multiline(
            '<style>',
            getSVGImageCSS(images.largeLightImage, 320, 320, 'h1'),
            '</style>',
            '<h1>Light background</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        const bgImageValue = getComputedStyle(container.querySelector('h1')).backgroundImage;
        expect(bgImageValue).toBe('none');
    });

    it('should ignore image analysis', async () => {
        container.innerHTML = multiline(
            '<style>',
            getSVGImageCSS(images.darkTransparentIcon, 16, 16, 'i'),
            '</style>',
            '<h1>Dark icon <i></i></h1>',
        );
        const fixes: DynamicThemeFix[] = [{
            url: ['*'],
            invert: [''],
            css: '',
            ignoreInlineStyle: ['.'],
            ignoreImageAnalysis: ['*'],
            disableStyleSheetsProxy: false,
            disableCustomElementRegistryProxy: false,
        }];
        createOrUpdateDynamicTheme(theme, fixes, false);
        const backgroundImage = getComputedStyle(container.querySelector('i')).backgroundImage;
        expect(backgroundImage).toContain('data:');
    });

    it('should handle background-image with URL and gradient', async () => {
        container.innerHTML = multiline(
            '<style>',
            `    h1 { background-image: url("${svgToDataURL(images.lightIcon)}"), linear-gradient(red, white);`,
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toMatch(/^url\("blob:.*"\), linear-gradient\(rgb\(204, 0, 0\), rgb\(0, 0, 0\)\)$/);
    });

    it('should handle background-image with non-base64 data URL', async () => {
        container.innerHTML = multiline(
            '<style>',
            `    h1 { background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="6" height="3">%3Cpath%20d%3D%22m0%202.5%20l2%20-1.5%20l1%200%20l2%201.5%20l1%200%22%20stroke%3D%22%23d11%22%20fill%3D%22none%22%20stroke-width%3D%22.7%22%2F%3E</svg>');`,
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toMatch(/^url\("blob:.*"\)$/);
    });

    it('should handle background-image with URL and gradient (revered)', async () => {
        container.innerHTML = multiline(
            '<style>',
            `    h1 { background-image: linear-gradient(red, white), url("${svgToDataURL(images.lightIcon)}");`,
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        await timeout(500);
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toMatch(/^linear-gradient\(rgb\(204, 0, 0\), rgb\(0, 0, 0\)\), url\("blob:.*"\)$/);
    });

    it('should handle background-image with empty URLs', async () => {
        container.innerHTML = multiline(
            '<style>',
            `    h1 { background-image: url(''), url(''), url("${svgToDataURL(images.lightIcon)}");`,
            '</style>',
            '<h1>Weird color <strong>Power</strong>!</h1>',
        );
        createOrUpdateDynamicTheme(theme, null, false);
        await waitForEvent('__darkreader__test__asyncQueueComplete');
        expect(getComputedStyle(container.querySelector('h1')).backgroundImage).toMatch(/^url\(""\), url\(""\), url\("blob:.*"\)$/);
    });
});
