import type {Theme, InversionFix} from '../definitions';

import {cssFilterStyleSheetTemplate} from './css-filter';
import {createFilterMatrix, Matrix} from './utils/matrix';
import type {SitePropsIndex} from './utils/parse';

export function createSVGFilterStylesheet(config: Theme, url: string, isTopFrame: boolean, fixes: string, index: SitePropsIndex<InversionFix>): string {
    // Chrome fails with "Unsafe attempt to load URL ... Domains, protocols and ports must match.
    const filterValue = 'url(#dark-reader-filter)';
    const reverseFilterValue = 'url(#dark-reader-reverse-filter)';
    const filterRoot = 'html';
    return cssFilterStyleSheetTemplate(filterRoot, filterValue, reverseFilterValue, config, url, isTopFrame, fixes, index);
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
