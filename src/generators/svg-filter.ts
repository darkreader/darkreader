import type {Theme, InversionFix} from '../definitions';
import {isFirefox} from '../utils/platform';

import {cssFilterStyleSheetTemplate} from './css-filter';
import {createFilterMatrix, Matrix} from './utils/matrix';
import type {SitePropsIndex} from './utils/parse';

export function createSVGFilterStylesheet(config: Theme, url: string, isTopFrame: boolean, fixes: string, index: SitePropsIndex<InversionFix>): string {
    let filterValue: string;
    let reverseFilterValue: string;
    if (isFirefox) {
        filterValue = getEmbeddedSVGFilterValue(getSVGFilterMatrixValue(config));
        reverseFilterValue = getEmbeddedSVGFilterValue(getSVGReverseFilterMatrixValue());
    } else {
        // Chrome fails with "Unsafe attempt to load URL ... Domains, protocols and ports must match.
        filterValue = 'url(#dark-reader-filter)';
        reverseFilterValue = 'url(#dark-reader-reverse-filter)';
    }
    const filterRoot = isFirefox ? 'body' : 'html';
    return cssFilterStyleSheetTemplate(filterRoot, filterValue, reverseFilterValue, config, url, isTopFrame, fixes, index);
}

function getEmbeddedSVGFilterValue(matrixValue: string): string {
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

function toSVGMatrix(matrix: number[][]): string {
    return matrix.slice(0, 4).map((m) => m.map((m) => m.toFixed(3)).join(' ')).join(' ');
}

export function getSVGFilterMatrixValue(config: Theme): string {
    return toSVGMatrix(createFilterMatrix(config));
}

export function getSVGReverseFilterMatrixValue(): string {
    return toSVGMatrix(Matrix.invertNHue());
}
