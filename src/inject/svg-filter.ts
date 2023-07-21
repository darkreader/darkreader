import {createNodeAsap, removeNode} from './utils/dom';

export function createOrUpdateSVGFilter(svgMatrix: string, svgReverseMatrix: string): void {
    createNodeAsap({
        selectNode: () => document.getElementById('dark-reader-svg')!,
        createNode: (target) => {
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const createMatrixFilter = (id: string, matrix: string) => {
                const filter = document.createElementNS(SVG_NS, 'filter');
                filter.id = id;
                filter.style.colorInterpolationFilters = 'sRGB';

                // Fix displaying dynamic content https://bugs.chromium.org/p/chromium/issues/detail?id=647437
                filter.setAttribute('x', '0');
                filter.setAttribute('y', '0');
                filter.setAttribute('width', '99999');
                filter.setAttribute('height', '99999');

                filter.appendChild(createColorMatrix(matrix));
                return filter;
            };

            const createColorMatrix = (matrix: string) => {
                const colorMatrix = document.createElementNS(SVG_NS, 'feColorMatrix');
                colorMatrix.setAttribute('type', 'matrix');
                colorMatrix.setAttribute('values', matrix);
                return colorMatrix;
            };

            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.id = 'dark-reader-svg';
            svg.style.height = '0';
            svg.style.width = '0';
            svg.appendChild(createMatrixFilter('dark-reader-filter', svgMatrix));
            svg.appendChild(createMatrixFilter('dark-reader-reverse-filter', svgReverseMatrix));
            target.appendChild(svg);
        },
        updateNode: (existing) => {
            const existingMatrix = existing.firstChild!.firstChild as SVGFEColorMatrixElement;
            if (existingMatrix.getAttribute('values') !== svgMatrix) {
                existingMatrix.setAttribute('values', svgMatrix);

                // Fix not triggering repaint
                const style = document.getElementById('dark-reader-style')!;
                const css = style.textContent;
                style.textContent = '';
                style.textContent = css;
            }
        },
        selectTarget: () => document.head,
        createTarget: () => {
            const head = document.createElement('head');
            document.documentElement.insertBefore(head, document.documentElement.firstElementChild);
            return head;
        },
        isTargetMutation: (mutation) => mutation.target.nodeName.toLowerCase() === 'head',
    });
}

export function removeSVGFilter(): void {
    removeNode(document.getElementById('dark-reader-svg'));
}
