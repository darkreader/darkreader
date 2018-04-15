import {iterateCSSDeclarations} from './css-rules';
import {getModifiableCSSDeclaration, ModifiableCSSDeclaration} from './modify-css';
import {FilterConfig} from '../../definitions';

export function getInlineStyleOverride(elements: HTMLElement[], filter: FilterConfig) {
    const styles: string[] = [];

    let prefix = Math.round(Date.now() * Math.random()).toString(16);
    let counter = 0;

    elements.forEach((el) => {
        const modDecs: ModifiableCSSDeclaration[] = [];
        el.style && iterateCSSDeclarations(el.style, (property, value) => {
            // Temporaty ignore background images
            // due to possible performance issues
            // and complexity of handling async requests
            if (property === 'background-image') {
                return;
            }
            const mod = getModifiableCSSDeclaration(property, value, null, null);
            if (mod) {
                modDecs.push(mod);
            }
        });

        if (modDecs.length > 0) {
            const id = `${prefix}-${++counter}`;
            el.dataset.darkreaderInlineId = id;
            const selector = `[data-darkreader-inline-id="${id}"]`;
            const lines: string[] = [];
            lines.push(`${selector} {`);
            modDecs.forEach(({property, value}) => {
                const val = typeof value === 'function' ? value(filter) : value;
                if (val) {
                    lines.push(`    ${property}: ${val} !important;`);
                }
            });
            lines.push('}');
            styles.push(lines.join('\n'));
        }
    });

    return styles.join('\n');
}
