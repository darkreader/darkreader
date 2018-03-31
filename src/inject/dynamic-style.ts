import {parse, rgbToHSL, hslToRGB, hslToString, RGBA, HSLA} from '../utils/color';
import {FilterConfig} from '../definitions';

declare const $FILTER: string;
const filter = JSON.parse($FILTER);

function iterate(iterator: (r: CSSPageRule) => void) {
    Array.from(document.styleSheets)
        .filter((s) => {
            let hasRules = false;
            try {
                hasRules = Boolean((s as any).rules);
            } catch (err) {
                console.warn(err);
            }
            return hasRules && (s.ownerNode as HTMLElement).id !== 'dark-reader-style';
        })
        .forEach((s) => {
            Array.from<CSSPageRule>((s as any).rules)
                .forEach((r) => iterator(r));
        });
}

function toCamelCase(spinalCase: string) {
    return spinalCase.split('-').filter((s) => s).map((p, i) => {
        if (i === 0) {
            return p;
        }
        return `${p.charAt(0).toUpperCase()}${p.substring(1)}`;
    }).join('');
}

function createStyle() {
    let style = document.getElementById('dark-reader-style') as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.id = 'dark-reader-style';
        document.head.appendChild(style);
    }

    const rules: ModifiableCSSRule[] = [];

    iterate((r) => {
        const declarations: ModifiableCSSDeclaration[] = [];
        const styleDeclaration = (r as any).style as CSSStyleDeclaration;
        styleDeclaration && Array.from(styleDeclaration).forEach((property) => {
            const name = toCamelCase(property);
            const value = styleDeclaration[name];
            if (!value) {
                return;
            }
            const declaration = getModifiableCSSDeclaration(property, value);
            if (declaration) {
                declarations.push(declaration);
            }
        });
        if (declarations.length > 0) {
            rules.push({selector: r.selectorText, declarations});
        }
    });

    const lines: string[] = [];
    lines.push('html, body, button, input, textarea {');
    lines.push(`    background-color: ${modifyBackgroundColor({r: 255, g: 255, b: 255}, filter)} !important;`)
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 0, b: 0}, filter)} !important;`);
    lines.push('}');
    lines.push('input::placeholder {');
    lines.push(`    color: ${modifyForegroundColor({r: 0, g: 0, b: 0, a: 0.75}, filter)} !important;`);
    lines.push('}');
    rules.forEach(({selector, declarations}) => {
        lines.push(`${selector} {`);
        declarations.forEach(({property, value}) => {
            lines.push(`    ${property}: ${typeof value === 'function' ? value(filter) : value} !important;`);
        });
        lines.push('}');
    });

    style.textContent = lines.join('\n');
    document.head.insertBefore(style, null);
}

const unparsableColors = new Set([
    'inherit',
    'transparent',
    'initial',
    'currentcolor',
]);

type CSSValueModifier = (filter: FilterConfig) => string;

function modifyBackgroundColor(rgb: RGBA, filter: FilterConfig) {
    const {h, s, l, a} = rgbToHSL(rgb);
    const ml = 0.3;
    const ks = 0.2;
    const x = s * ks + (ml - ks);
    return hslToString({h, s: s * 0.75, l: l * x, a});
}

function modifyForegroundColor(rgb: RGBA, filter: FilterConfig) {
    const {h, s, l, a} = rgbToHSL(rgb);
    const ml = 0.5;
    const ks = 0.2;
    const x = s * ks + (ml - ks);
    return hslToString({h, s: s * 0.9, l: l * x + (1 - x), a});
}

function modifyBorderColor(rgb: RGBA, filter: FilterConfig) {
    return modifyBackgroundColor(rgb, filter);
}

function modifyGradientColor(rgb: RGBA, filter: FilterConfig) {
    return modifyBackgroundColor(rgb, filter);
}

function getColorModifier(prop: string, value: string): CSSValueModifier {
    if (unparsableColors.has(value.toLowerCase())) {
        return null;
    }
    try {
        const rgb = parse(value);
        if (prop.indexOf('background') >= 0) {
            return (filter) => modifyBackgroundColor(rgb, filter);
        }
        if (prop.indexOf('border') >= 0 || prop.indexOf('outline') >= 0) {
            return (filter) => modifyBorderColor(rgb, filter);
        }
        return (filter) => modifyForegroundColor(rgb, filter);

    } catch (err) {
        console.warn('Color parse error', err);
        return null;
    }
}

function tryParse($color: string) {
    try {
        return parse($color);
    } catch (err) {
        return null;
    }
}

function getMatches(regex: RegExp, input: string) {
    const matches: string[] = [];
    let m: RegExpMatchArray;
    while (m = regex.exec(input)) {
        matches.push(m[0]);
    }
    return matches;
}

function getGradientModifier(prop: string, value: string): CSSValueModifier {
    try {
        const gradientRegex = /[a-z]+-gradient\(([^\(\)]*?(\([^\(^\)]*?\)[^\(\)]*?)*)\)/ig;

        const modifiers = getMatches(gradientRegex, value).map((gradient) => {
            const match = gradient.match(/^(.*-gradient)\((.*)\)$/);
            const type = match[1];
            const content = match[2];

            const partsRegex = /([^\(\),]+(\([^\(\)]*\))?[^\(\),]*),?/g;

            const parts = getMatches(partsRegex, content).map((part) => {
                let rgb = tryParse(part);
                if (rgb) {
                    return (filter: FilterConfig) => modifyGradientColor(rgb, filter);
                }
                const space = part.lastIndexOf(' ');
                rgb = tryParse(part.substring(0, space));
                if (rgb) {
                    return (filter: FilterConfig) => `${modifyGradientColor(rgb, filter)} ${part.substring(space + 1)}`;
                }
                return () => part;
            });

            return (filter: FilterConfig) => {
                return `${type}(${parts.map((modify) => modify(filter)).join(', ')})`;
            };
        });

        return (filter) => modifiers.map((modify) => modify(filter)).join(', ');

    } catch (err) {
        console.warn(`Unable to parse gradient ${value}`, err);
        return null;
    }
}

interface ModifiableCSSDeclaration {
    property: string;
    value: string | CSSValueModifier;
}

interface ModifiableCSSRule {
    selector: string;
    declarations: ModifiableCSSDeclaration[];
}

function getModifiableCSSDeclaration(property: string, value: string): ModifiableCSSDeclaration {
    if (property.indexOf('color') >= 0) {
        const modifier = getColorModifier(property, value);
        if (modifier) {
            return {property, value: modifier};
        }
    } else if (property.indexOf('background') >= 0 && value.indexOf('-gradient') >= 0) {
        const modifier = getGradientModifier(property, value);
        if (modifier) {
            return {property, value: modifier};
        }
    } else if (property.indexOf('background-repeat') >= 0 && value === 'repeat') {
        return {property: 'background-image', value: 'none'};
    }
    return null;
}

function ready() {
    createStyle();
    const observer = new MutationObserver((mutation) => {
        const styleMutations = mutation.filter((m) => {
            return Array.from(m.addedNodes)
                .concat(Array.from(m.removedNodes))
                .some((n: Element) => {
                    return (
                        (n instanceof HTMLStyleElement) ||
                        (n instanceof HTMLLinkElement && n.rel === 'stylesheet')
                    ) && (n.id !== 'dark-reader-style');
                });
        });
        if (styleMutations.length > 0) {
            createStyle();
        }
    });
    observer.observe(document.head, {childList: true, attributes: true, characterData: true});
}

if (document.head) {
    ready();
} else {
    const observer = new MutationObserver(() => {
        if (document.head) {
            observer.disconnect();
            ready();
        }
    });
    observer.observe(document, {childList: true, subtree: true});
}
