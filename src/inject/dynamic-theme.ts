import {parse, rgbToHSL, hslToRGB, hslToString, RGBA, HSLA} from '../utils/color';
import {spinalToCamelCase} from '../utils/text';
import {scale} from '../utils/math';
import {removeStyle} from './style';
import {FilterConfig} from '../definitions';

const cache = new WeakMap<CSSPageRule, ModifiableCSSRule>();

function createTheme(filter: FilterConfig) {
    let style = document.getElementById('dark-reader-style') as HTMLStyleElement;
    if (!style) {
        style = document.createElement('style');
        style.id = 'dark-reader-style';
        document.head.appendChild(style);
    }

    const rules: ModifiableCSSRule[] = [];

    iterateCSSRules((r) => {
        if (cache.has(r)) {
            const rule = cache.get(r);
            if (rule) {
                rules.push(rule);
            }
            return;
        }

        const declarations: ModifiableCSSDeclaration[] = [];
        const styleDeclaration = (r as any).style as CSSStyleDeclaration;
        styleDeclaration && Array.from(styleDeclaration).forEach((property) => {
            const name = spinalToCamelCase(property);
            const value = styleDeclaration[name];
            if (!value) {
                return;
            }
            const declaration = getModifiableCSSDeclaration(property, value);
            if (declaration) {
                declarations.push(declaration);
            }
        });
        let rule: ModifiableCSSRule = null;
        if (declarations.length > 0) {
            rule = {selector: r.selectorText, declarations};
            rules.push(rule);
        }
        cache.set(r, rule);
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
    '-webkit-focus-ring-color',
]);

type CSSValueModifier = (filter: FilterConfig) => string;

function modifyBackgroundColor(rgb: RGBA, filter: FilterConfig) {
    const {h, s, l, a} = rgbToHSL(rgb);

    const lMin = 0.1;
    const lMaxS0 = 0.2;
    const lMaxS1 = 0.4;

    const lMax = scale(s, 0, 1, lMaxS0, lMaxS1);
    const lx = (l < lMax ?
        scale(l, 0, lMax, lMin, lMax) :
        scale(l, lMax, 1, lMax, lMin));
    const color = {h, s, l: lx, a};

    return hslToString(color);
}

function modifyForegroundColor(rgb: RGBA, filter: FilterConfig) {
    const {h, s, l, a} = rgbToHSL(rgb);

    const lMax = 0.9;
    const lMinS0 = 0.8;
    const lMinS1 = 0.6;

    const lMin = scale(s, 0, 1, lMinS0, lMinS1);
    const lx = (l < lMax ?
        scale(l, 0, lMin, lMax, lMin) :
        scale(l, lMin, 1, lMin, lMax));
    const color = {h, s, l: lx, a};

    return hslToString(color);
}

function modifyBorderColor(rgb: RGBA, filter: FilterConfig) {
    return modifyBackgroundColor(rgb, filter);
}

function modifyGradientColor(rgb: RGBA, filter: FilterConfig) {
    const {h, s, l, a} = rgbToHSL(rgb);

    const lMin = 0.1;
    const lMaxS0 = 0.2;
    const lMaxS1 = 0.4;

    const lMax = scale(s, 0, 1, lMaxS0, lMaxS1);
    const lx = scale(l, 0, 1, lMin, lMax);
    const color = {h, s, l: lx, a};

    return hslToString(color);
}

const colorParseCache = new Map<string, RGBA>();

function parseColorWithCache($color: string) {
    if (colorParseCache.has($color)) {
        return colorParseCache.get($color);
    }
    const color = parse($color);
    colorParseCache.set($color, color);
    return color;
}

function getColorModifier(prop: string, value: string): CSSValueModifier {
    if (unparsableColors.has(value.toLowerCase())) {
        return null;
    }
    try {
        const rgb = parseColorWithCache(value);
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
        return parseColorWithCache($color);
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
    if (property.indexOf('color') >= 0 && property !== '-webkit-print-color-adjust') {
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

function iterateCSSRules(iterator: (r: CSSPageRule) => void) {
    Array.from(document.styleSheets)
        .filter((s) => {
            const node = s.ownerNode as HTMLStyleElement | HTMLLinkElement;
            if (node.id === 'dark-reader-style' || loadingStyles.has(node)) {
                return false;
            }

            let hasRules = false;
            try {
                hasRules = Boolean((s as any).cssRules);
            } catch (err) {
                console.warn(err);
                if (node instanceof HTMLLinkElement) {
                    replaceCORSStyle(node);
                }
            }
            return hasRules;
        })
        .forEach((s) => {
            Array.from<CSSPageRule>((s as any).cssRules)
                .forEach((r) => iterator(r));
        });
}

const loadingStyles = new WeakSet<Node>();

async function replaceCORSStyle(link: HTMLLinkElement) {
    const url = link.href;
    loadingStyles.add(link);

    link.disabled = true;
    const response = await fetch(url);
    const text = await response.text();

    const style = document.createElement('style');
    style.dataset.url = url;
    style.textContent = text;
    link.parentElement.insertBefore(style, link.nextElementSibling);
}

let styleChangeObserver: MutationObserver = null;
const linksSubscriptions = new Map<Element, () => void>();

function watchForLinksLoading(onLoad: () => void) {
    linksSubscriptions.forEach((listener, link) => link.removeEventListener('load', listener));
    linksSubscriptions.clear();
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    links.forEach((link) => {
        link.addEventListener('load', onLoad);
        linksSubscriptions.set(link, onLoad);
        if (link.parentElement !== document.head) {
            document.head.insertBefore(link, document.getElementById('dark-reader-style'));
        }
    });
}

function createThemeAndWatchForUpdates(filter: FilterConfig) {
    createTheme(filter);
    watchForLinksLoading(() => createTheme(filter));
    if (styleChangeObserver) {
        styleChangeObserver.disconnect();
    }
    styleChangeObserver = new MutationObserver((mutations) => {
        const styleMutations = mutations.filter((m) => {
            return Array.from(m.addedNodes)
                .concat(Array.from(m.removedNodes))
                .some((n: Element) => {
                    return ((
                        (n instanceof HTMLStyleElement) ||
                        (n instanceof HTMLLinkElement && n.rel === 'stylesheet')
                    ) && (n.id !== 'dark-reader-style'));
                });
        });
        if (styleMutations.length > 0) {
            createTheme(filter);
            watchForLinksLoading(() => createTheme(filter));
        }
    });
    styleChangeObserver.observe(document.head, {childList: true});
}

export function createOrUpdateDynamicTheme(filter: FilterConfig) {
    if (document.head) {
        createThemeAndWatchForUpdates(filter);
    } else {
        const headObserver = new MutationObserver(() => {
            if (document.head) {
                headObserver.disconnect();
                createThemeAndWatchForUpdates(filter);
            }
        });
        headObserver.observe(document, {childList: true, subtree: true});
    }
}

export function removeDynamicTheme() {
    removeStyle();
    if (styleChangeObserver) {
        styleChangeObserver.disconnect();
        styleChangeObserver = null;
    }
}
