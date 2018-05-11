import {createFilterMatrix, Matrix} from './utils/matrix';
import {isFirefox} from '../utils/platform';
import {cssFilterStyleheetTemplate} from './css-filter';
import {FilterConfig, InversionFix} from '../definitions';

export function createSVGFilterStylesheet(config: FilterConfig, url: string, frameURL: string, inversionFixes: InversionFix[]) {
    let filterValue: string;
    let reverseFilterValue: string;
    if (isFirefox()) {
        filterValue = getEmbeddedSVGFilterValue(getSVGFilterMatrixValue(config));
        reverseFilterValue = getEmbeddedSVGFilterValue(getSVGReverseFilterMatrixValue());
    } else {
        // Chrome fails with "Unsafe attempt to load URL ... Domains, protocols and ports must match.
        filterValue = 'url(#dark-reader-filter)';
        reverseFilterValue = 'url(#dark-reader-reverse-filter)';
    }
    return cssFilterStyleheetTemplate(filterValue, reverseFilterValue, config, url, frameURL, inversionFixes);
}

function getEmbeddedSVGFilterValue(matrixValue: string) {
    const id = 'dark-reader-filter';
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg">',
        `<filter id="${id}" style="color-interpolation-filters: sRGB;">`,
        `<feColorMatrix type="matrix" values="${matrixValue}" />`,
        '</filter>',
        '</svg>',
    ].join('');
    return `url(data:image/svg+xml;base64,${btoa(svg)}#${id})`;
}

function toSVGMatrix(matrix: number[][]) {
    return matrix.slice(0, 4).map(m => m.map(m => m.toFixed(3)).join(' ')).join(' ');
}

export function getSVGFilterMatrixValue(config: FilterConfig) {
    return toSVGMatrix(createFilterMatrix(config));
}

export function getSVGReverseFilterMatrixValue() {
    return toSVGMatrix(Matrix.invertNHue());
}
