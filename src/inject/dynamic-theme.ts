import {parse, rgbToHSL, hslToRGB, hslToString, RGBA, HSLA} from '../utils/color';
import {spinalToCamelCase} from '../utils/text';
import {scale} from '../utils/math';
import {removeStyle} from './style';
import {FilterConfig} from '../definitions';

const cache = new WeakMap<CSSStyleRule, ModifiableCSSRule>();

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
        const styleDeclaration = r.style as CSSStyleDeclaration;
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
            if (r.parentRule instanceof CSSMediaRule) {
                rule.media = (r.parentRule as CSSMediaRule).media.mediaText;
            }
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
    rules.forEach(({selector, declarations, media}) => {
        if (media) {
            lines.push(`@media ${media} {`);
        }
        lines.push(`${selector} {`);
        declarations.forEach(({property, value}) => {
            lines.push(`    ${property}: ${typeof value === 'function' ? value(filter) : value} !important;`);
        });
        lines.push('}');
        if (media) {
            lines.push('}')
        }
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
    const {h, s, l, a} = rgbToHSL(rgb);

    const lMinS0 = 0.2;
    const lMinS1 = 0.3;
    const lMaxS0 = 0.4;
    const lMaxS1 = 0.5;

    const lMin = scale(s, 0, 1, lMinS0, lMinS1);
    const lMax = scale(s, 0, 1, lMaxS0, lMaxS1);
    const lx = scale(l, 0, 1, lMax, lMin);
    const color = {h, s, l: lx, a};

    return hslToString(color);
}

function modifyShadowColor(rgb: RGBA, filter: FilterConfig) {
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

function getMatches(regex: RegExp, input: string, group = 0) {
    const matches: string[] = [];
    let m: RegExpMatchArray;
    while (m = regex.exec(input)) {
        matches.push(m[group]);
    }
    return matches;
}

const gradientRegex = /[\-a-z]+gradient\(([^\(\)]*(\(.*?\)))*[^\(\)]*\)/g;
const cssURLRegex = /url\((('.+?')|(".+?")|([^\)]*?))\)/g;

function getBgImageModifier(prop: string, value: string): CSSValueModifier {
    try {

        const gradients = getMatches(gradientRegex, value);
        const urls = getMatches(cssURLRegex, value);

        if (urls.length === 0 && gradients.length === 0) {
            return null;
        }

        const getIndices = (matches: string[]) => {
            let index = 0;
            return matches.map((match) => {
                const valueIndex = value.indexOf(match, index);
                index = valueIndex + match.length;
                return {match, index: valueIndex};
            });
        };
        const matches = getIndices(urls).map((i) => ({type: 'url', ...i}))
            .concat(getIndices(gradients).map((i) => ({type: 'gradient', ...i})))
            .sort((a, b) => a.index - b.index);

        const getGradientModifier = (gradient: string) => {
            const match = gradient.match(/^(.*-gradient)\((.*)\)$/);
            const type = match[1];
            const content = match[2];

            const partsRegex = /([^\(\),]+(\([^\(\)]*\))?[^\(\),]*),?/g;

            const parts = getMatches(partsRegex, content, 1).map((part) => {
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
        };

        const getURLModifier = (urlValue: string) => {
            return (filter: FilterConfig) => urlValue;
        };

        const modifiers: CSSValueModifier[] = [];

        let index = 0;
        matches.forEach(({match, type, index: matchStart}, i) => {
            const prefixStart = index;
            const matchEnd = matchStart + match.length;
            index = matchEnd;
            modifiers.push(() => value.substring(prefixStart, matchStart));
            modifiers.push(type === 'url' ? getURLModifier(match) : getGradientModifier(match));
            if (i === matches.length - 1) {
                modifiers.push(() => value.substring(matchEnd));
            }
        });

        return (filter: FilterConfig) => modifiers.map((modify) => modify(filter)).join('');

    } catch (err) {
        console.warn(`Unable to parse gradient ${value}`, err);
        return null;
    }
}

function getShadowModifier(prop: string, value: string): CSSValueModifier {
    try {
        let index = 0;
        const colorMatches = getMatches(/(^|\s)([a-z]+\(.+?\)|#[0-9a-f]+|[a-z]+)(.*?(inset|outset)?($|,))/ig, value, 2);
        const modifiers = colorMatches.map((match, i) => {
            const prefixIndex = index;
            const matchIndex = value.indexOf(match, index);
            const matchEnd = matchIndex + match.length;
            index = matchEnd;
            const rgb = tryParse(match);
            if (!rgb) {
                return () => value.substring(prefixIndex, matchEnd);
            }
            return (filter: FilterConfig) => `${value.substring(prefixIndex, matchIndex)}${modifyShadowColor(rgb, filter)}${i === colorMatches.length - 1 ? value.substring(matchEnd) : ''}`;
        });

        return (filter: FilterConfig) => modifiers.map((modify) => modify(filter)).join('');

    } catch (err) {
        console.warn(`Unable to parse shadow ${value}`, err);
        return null;
    }
}

interface ModifiableCSSDeclaration {
    property: string;
    value: string | CSSValueModifier;
}

interface ModifiableCSSRule {
    selector: string;
    media?: string;
    declarations: ModifiableCSSDeclaration[];
}

function getModifiableCSSDeclaration(property: string, value: string): ModifiableCSSDeclaration {
    if (property.indexOf('color') >= 0 && property !== '-webkit-print-color-adjust') {
        const modifier = getColorModifier(property, value);
        if (modifier) {
            return {property, value: modifier};
        }
    } else if (property === 'background-image') {
        const modifier = getBgImageModifier(property, value);
        if (modifier) {
            return {property, value: modifier};
        }
    } else if (property.indexOf('shadow') >= 0) {
        const modifier = getShadowModifier(property, value);
        if (modifier) {
            return {property, value: modifier};
        }
    }
    return null;
}

function iterateCSSRules(iterator: (r: CSSStyleRule) => void) {
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
            Array.from<CSSStyleRule>((s as any).cssRules)
                .forEach((r) => {
                    if (r instanceof CSSMediaRule) {
                        Array.from(r.cssRules).forEach((mr) => iterator(mr as CSSStyleRule));
                    } else {
                        iterator(r);
                    }
                });
        });
}

const loadingStyles = new WeakSet<Node>();

function parseURL(url: string) {
    const a = document.createElement('a');
    a.href = url;
    return a;
}

async function replaceCORSStyle(link: HTMLLinkElement) {
    const url = link.href;
    loadingStyles.add(link);

    link.disabled = true;
    const response = await fetch(url);
    const text = await response.text();

    const cssURL = parseURL(url);
    const cssBasePath = `${cssURL.protocol}//${cssURL.host}${cssURL.pathname.replace(/\/[^\/]+?\.css$/i, '')}`;
    const cssText = text.replace(cssURLRegex, (match, pathMatch: string) => {
        const pathValue = pathMatch.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        if (!pathValue.match(/^.*?\/\//) && !pathValue.match(/^data\:/)) {
            const relativePath = pathValue.replace(/^\//, '');
            const baseParts = cssBasePath.split('/');
            const backwards = getMatches(/\.\.\//g, relativePath);
            const u = parseURL(`${baseParts.slice(0, baseParts.length - backwards.length).join('/')}/${relativePath.replace(/^(\.\.\/)*/, '')}`);
            return `url("${u.href}")`
        }
        return match;
    });

    const style = document.createElement('style');
    style.dataset.url = url;
    style.textContent = cssText;
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
